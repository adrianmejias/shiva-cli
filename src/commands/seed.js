'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');

const { requireServerRoot, getResourcesDir } = require('../utils/server-root');
const { getDatabaseConfig } = require('../utils/config-reader');
const { scanModules } = require('../utils/lua-parser');
const { normalizeModuleName } = require('../generators/index');

function seedCommand(program) {
  program
    .command('seed')
    .description('Run database seeders')
    .option('-m, --module <module>', 'Seed only a specific module')
    .option('--dry-run', 'Show what would run without executing')
    .action(async (options) => { await run(options); });
}

async function run(options) {
  const serverRoot = requireServerRoot();
  const dbConfig   = getDatabaseConfig(serverRoot);

  if (!dbConfig) {
    console.error(chalk.red('✖ No database configuration found in shiva.json'));
    process.exit(1);
  }

  let connection;
  try {
    const mysql = require('mysql2/promise');
    connection  = await mysql.createConnection({
      host:               dbConfig.host,
      port:               dbConfig.port || 3306,
      user:               dbConfig.user,
      password:           dbConfig.password,
      database:           dbConfig.database,
      multipleStatements: true,
    });
  } catch (err) {
    console.error(chalk.red('✖ Could not connect to database:'), err.message);
    process.exit(1);
  }

  try {
    const resourcesDir = getResourcesDir(serverRoot);
    let modules        = scanModules(resourcesDir);

    if (options.module) {
      const name = normalizeModuleName(options.module);
      modules    = modules.filter(m => m.name === name);
      if (modules.length === 0) {
        console.error(chalk.red(`✖ Module not found: ${name}`));
        process.exit(1);
      }
    }

    const seeds = collectSeeds(modules);

    if (seeds.length === 0) {
      console.log(chalk.gray('  No seed files found (expected at seeds/*.lua inside each module).'));
      return;
    }

    console.log('');
    console.log(chalk.bold(`Running ${seeds.length} seeder(s)...\n`));

    for (const seed of seeds) {
      if (options.dryRun) {
        console.log(chalk.yellow(`  [dry-run] ${seed.name}`));
        continue;
      }

      process.stdout.write(chalk.gray(`  Seeding: ${seed.name} ...`));
      try {
        const mod = require(seed.path);
        await mod.run({ execute: (sql, params) => connection.execute(sql, params || []) });
        console.log(chalk.green(' done'));
      } catch (err) {
        console.log(chalk.red(' failed'));
        console.error(chalk.red(`    Error: ${err.message}`));
      }
    }

    if (!options.dryRun) {
      console.log('');
      console.log(chalk.green('✔ Seeding complete.'));
    }
  } finally {
    await connection.end();
  }
}

function collectSeeds(modules) {
  const seeds = [];
  for (const mod of modules) {
    const seedsDir = path.join(mod.path, 'seeds');
    if (!fs.existsSync(seedsDir)) continue;
    const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.lua')).sort();
    for (const file of files) {
      seeds.push({ name: `${mod.name}/${file}`, path: path.join(seedsDir, file) });
    }
  }
  return seeds;
}

module.exports = seedCommand;
