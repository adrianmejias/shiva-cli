'use strict';

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const { requireServerRoot } = require('../../utils/server-root');
const { getDatabaseConfig } = require('../../utils/config-reader');
const { scanModules } = require('../../utils/lua-parser');

const MIGRATIONS_TABLE = 'shiva_migrations';

/**
 * Register the `shiva migrate:status` command.
 * @param {import('commander').Command} program
 */
function migrateStatusCommand(program) {
  program
    .command('migrate:status')
    .description('Show the status of all database migrations')
    .action(async () => {
      await run();
    });
}

async function run() {
  const serverRoot = requireServerRoot();
  const dbConfig = getDatabaseConfig(serverRoot);

  if (!dbConfig) {
    console.error(chalk.red('✖ No database configuration found in shiva.json'));
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
    });
  } catch (err) {
    console.error(chalk.red('✖ Could not connect to database:'), err.message);
    process.exit(1);
  }

  try {
    const resourcesDir = path.join(serverRoot, 'resources');
    const modules = scanModules(resourcesDir);
    const allMigrations = collectMigrations(modules);

    let ranMigrations = new Map();
    const tableExists = await checkTableExists(connection, dbConfig.database);
    if (tableExists) {
      const [rows] = await connection.execute(
        `SELECT \`migration\`, \`batch\`, \`ran_at\` FROM \`${MIGRATIONS_TABLE}\` ORDER BY \`id\``
      );
      for (const row of rows) {
        ranMigrations.set(row.migration, row);
      }
    }

    console.log('');
    console.log(chalk.bold('Migration Status'));
    console.log(chalk.gray('─'.repeat(72)));

    if (allMigrations.length === 0) {
      console.log(chalk.gray('  No migration files found.'));
    } else {
      const statusWidth = 9;
      const batchWidth = 7;
      console.log(
        chalk.bold(
          `  ${'Status'.padEnd(statusWidth)}  ${'Batch'.padEnd(batchWidth)}  Migration`
        )
      );
      console.log(chalk.gray('  ' + '─'.repeat(68)));

      for (const migration of allMigrations) {
        const info = ranMigrations.get(migration.name);
        if (info) {
          console.log(
            chalk.green('  ' + 'Ran'.padEnd(statusWidth)) +
            chalk.gray('  ' + String(info.batch).padEnd(batchWidth)) +
            '  ' + migration.name
          );
        } else {
          console.log(
            chalk.yellow('  ' + 'Pending'.padEnd(statusWidth)) +
            chalk.gray('  ' + '—'.padEnd(batchWidth)) +
            '  ' + chalk.yellow(migration.name)
          );
        }
      }
    }

    console.log(chalk.gray('─'.repeat(72)));
    const ranCount = allMigrations.filter(m => ranMigrations.has(m.name)).length;
    const pendingCount = allMigrations.length - ranCount;
    console.log(chalk.gray(`  ${ranCount} ran  ·  ${pendingCount} pending`));
    console.log('');

  } finally {
    await connection.end();
  }
}

async function checkTableExists(conn, database) {
  const [rows] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, MIGRATIONS_TABLE]
  );
  return rows.length > 0;
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
        module: mod.name,
      });
    }
  }
  return migrations.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = migrateStatusCommand;
