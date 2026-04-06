'use strict';

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const { requireServerRoot } = require('../../utils/server-root');
const { getDatabaseConfig } = require('../../utils/config-reader');
const { scanModules } = require('../../utils/lua-parser');

const MIGRATIONS_TABLE = 'shiva_migrations';

/**
 * Register the `shiva migrate` command.
 * @param {import('commander').Command} program
 */
function migrateRunCommand(program) {
  program
    .command('migrate')
    .description('Run all pending database migrations')
    .option('--dry-run', 'Show what would run without executing')
    .action(async (options) => {
      await run(options);
    });
}

async function run(options) {
  const serverRoot = requireServerRoot();
  const dbConfig = getDatabaseConfig(serverRoot);

  if (!dbConfig) {
    console.error(chalk.red('✖ No database configuration found in shiva.json'));
    console.error(chalk.gray('  Add a "database" section to shiva.json with host, port, user, password, database.'));
    process.exit(1);
  }

  let connection;
  try {
    const mysql = require('mysql2/promise');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port || 3306,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true,
    });
  } catch (err) {
    console.error(chalk.red('✖ Could not connect to database:'), err.message);
    process.exit(1);
  }

  try {
    await ensureMigrationsTable(connection);

    const resourcesDir = path.join(serverRoot, 'resources');
    const modules = scanModules(resourcesDir);
    const allMigrations = collectMigrations(modules);

    if (allMigrations.length === 0) {
      console.log(chalk.gray('  No migration files found.'));
      return;
    }

    const ran = await getRanMigrations(connection);
    const pending = allMigrations.filter(m => !ran.has(m.name));

    if (pending.length === 0) {
      console.log(chalk.green('✔ Nothing to migrate — all up to date.'));
      return;
    }

    console.log('');
    console.log(chalk.bold(`Running ${pending.length} migration(s)...\n`));

    const batch = await getNextBatch(connection);

    for (const migration of pending) {
      if (options.dryRun) {
        console.log(chalk.yellow(`  [dry-run] ${migration.name}`));
        continue;
      }

      process.stdout.write(chalk.gray(`  Migrating: ${migration.name} ...`));

      try {
        const mod = require(migration.path);
        await mod.up({ execute: (sql) => connection.execute(sql) });
        await recordMigration(connection, migration.name, batch);
        console.log(chalk.green(' done'));
      } catch (err) {
        console.log(chalk.red(' failed'));
        console.error(chalk.red(`    Error: ${err.message}`));
        console.error(chalk.yellow('  Migration stopped. Fix the error and re-run.'));
        break;
      }
    }

    if (!options.dryRun) {
      console.log('');
      console.log(chalk.green(`✔ Batch ${batch} complete.`));
    }

  } finally {
    await connection.end();
  }
}

async function ensureMigrationsTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      \`id\`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`migration\`  VARCHAR(255) NOT NULL UNIQUE,
      \`batch\`      INT UNSIGNED NOT NULL DEFAULT 1,
      \`ran_at\`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

async function getRanMigrations(conn) {
  const [rows] = await conn.execute(`SELECT \`migration\` FROM \`${MIGRATIONS_TABLE}\``);
  return new Set(rows.map(r => r.migration));
}

async function getNextBatch(conn) {
  const [rows] = await conn.execute(`SELECT COALESCE(MAX(\`batch\`), 0) + 1 AS next_batch FROM \`${MIGRATIONS_TABLE}\``);
  return rows[0].next_batch;
}

async function recordMigration(conn, name, batch) {
  await conn.execute(
    `INSERT INTO \`${MIGRATIONS_TABLE}\` (\`migration\`, \`batch\`) VALUES (?, ?)`,
    [name, batch]
  );
}

function collectMigrations(modules) {
  const migrations = [];
  for (const mod of modules) {
    const migrationsDir = path.join(mod.path, 'migrations');
    if (!fs.existsSync(migrationsDir)) continue;

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.lua'))
      .sort();

    for (const file of files) {
      migrations.push({
        name: `${mod.name}/${file.replace('.lua', '')}`,
        path: path.join(migrationsDir, file),
        module: mod.name,
      });
    }
  }

  return migrations.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = migrateRunCommand;
