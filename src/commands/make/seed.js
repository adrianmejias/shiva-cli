'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir } = require('../../utils/server-root');
const { writeTemplate, toSnakeCase, normalizeModuleName } = require('../../generators/index');

function makeSeedCommand(program) {
  program
    .command('make:seed <name>')
    .description('Scaffold a database seeder inside a module')
    .requiredOption('-m, --module <module>', 'Target module name')
    .option('-t, --table <table>', 'Target database table name')
    .action((name, options) => { run(name, options); });
}

function run(rawName, options) {
  const seedName   = toSnakeCase(rawName).replace(/-/g, '_');
  const moduleName = normalizeModuleName(options.module);
  const tableName  = options.table || seedName;
  const fileName   = `${seedName}.lua`;

  const serverRoot = requireServerRoot();
  const moduleDir  = path.join(getShivaModulesDir(serverRoot), moduleName);

  if (!fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module not found: ${moduleName}`));
    process.exit(1);
  }

  const seedsDir = path.join(moduleDir, 'seeds');
  fs.mkdirSync(seedsDir, { recursive: true });

  const destFile = path.join(seedsDir, fileName);
  if (fs.existsSync(destFile)) {
    console.error(chalk.red(`✖ Seed already exists: ${destFile}`));
    process.exit(1);
  }

  writeTemplate('seed.lua.tpl', destFile, { table_name: tableName });

  console.log('');
  console.log(chalk.green(`✔ Created seed: ${chalk.bold(fileName)}`));
  console.log(chalk.gray(`  Path: ${path.relative(process.cwd(), destFile)}`));
  console.log(chalk.gray(`  Run:  shiva seed --module ${moduleName}`));
  console.log('');
}

module.exports = makeSeedCommand;
