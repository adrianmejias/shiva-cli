'use strict';

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const { requireServerRoot } = require('../../utils/server-root');
const { getDatabaseConfig } = require('../../utils/config-reader');
const { scanModules } = require('../../utils/lua-parser');

const MIGRATIONS_TABLE = 'shiva_migrations';

/**
 * Register the `shiva migrate:rollback` command.
 * @param {import('commander').Command} program
 */
function migrateRollbackCommand(program) {
  program
    .command('migrate:rollback')
    .description('Roll back the last migration batch')
    .option('-s, --steps <n>', 'Number of batches to roll back', '1')
    .option('--dry-run', 'Show what would roll back without executing')
    .action(async (options) => {
      await run(options);
    });
}

async function run(options) {
  const serverRoot = requireServerRoot();
  const dbConfig = getDatabaseConfig(serverRoot);
  const steps = Math.max(1, parseInt(options.steps, 10) || 1);

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
      multipleStatements: true,
    });
  } catch (err) {
    console.error(chalk.red('✖ Could not connect to database:'), err.message);
    process.exit(1);
  }

  try {
    const tableExists = await checkTableExists(connection, dbConfig.database);
    if (!tableExists) {
      console.log(chalk.gray('  No migrations table found. Nothing to roll back.'));
      return;
    }

    const [batchRows] = await connection.execute(
      `SELECT MAX(\`batch\`) AS max_batch FROM \`${MIGRATIONS_TABLE}\``
    );
    const maxBatch = batchRows[0].max_batch;

    if (!maxBatch) {
      console.log(chalk.gray('  Nothing to roll back.'));
      return;
    }

    const minBatch = Math.max(1, maxBatch - steps + 1);
    const [rows] = await connection.execute(
      `SELECT \`migration\` FROM \`${MIGRATIONS_TABLE}\` WHERE \`batch\` >= ? ORDER BY \`id\` DESC`,
      [minBatch]
    );

    if (rows.length === 0) {
      console.log(chalk.gray('  Nothing to roll back.'));
      return;
    }

    const resourcesDir = path.join(serverRoot, 'resources');
    const modules = scanModules(resourcesDir);
    const migrationMap = buildMigrationMap(modules);

    console.log('');
    console.log(chalk.bold(`Rolling back ${rows.length} migration(s) (${steps} batch(es))...\n`));

    for (const row of rows) {
      const migName = row.migration;

      if (options.dryRun) {
        console.log(chalk.yellow(`  [dry-run] rollback: ${migName}`));
        continue;
      }

      process.stdout.write(chalk.gray(`  Rolling back: ${migName} ...`));

      const filePath = migrationMap[migName];
      if (!filePath || !fs.existsSync(filePath)) {
        console.log(chalk.yellow(' skipped (file not found)'));
        continue;
      }

      try {
        const mod = require(filePath);
        if (typeof mod.down === 'function') {
          await mod.down({ execute: (sql) => connection.execute(sql) });
        }
        await connection.execute(
          `DELETE FROM \`${MIGRATIONS_TABLE}\` WHERE \`migration\` = ?`,
          [migName]
        );
        console.log(chalk.green(' done'));
      } catch (err) {
        console.log(chalk.red(' failed'));
        console.error(chalk.red(`    Error: ${err.message}`));
        break;
      }
    }

    if (!options.dryRun) {
      console.log('');
      console.log(chalk.green(`✔ Rolled back ${steps} batch(es).`));
    }

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

function buildMigrationMap(modules) {
  const map = {};
  for (const mod of modules) {
    const migrationsDir = path.join(mod.path, 'migrations');
    if (!fs.existsSync(migrationsDir)) continue;

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.lua'));
    for (const file of files) {
      const key = `${mod.name}/${file.replace('.lua', '')}`;
      map[key] = path.join(migrationsDir, file);
    }
  }
  return map;
}

module.exports = migrateRollbackCommand;
