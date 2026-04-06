'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir } = require('../../utils/server-root');
const { writeTemplate, toSnakeCase, normalizeModuleName } = require('../../generators/index');

/**
 * Register the `shiva make:migration` command.
 * @param {import('commander').Command} program
 */
function makeMigrationCommand(program) {
  program
    .command('make:migration <name>')
    .description('Create a new database migration file inside a module')
    .requiredOption('-m, --module <module>', 'Target module name')
    .action((name, options) => {
      run(name, options);
    });
}

function run(rawName, options) {
  const snakeName = toSnakeCase(rawName).replace(/-/g, '_');
  const moduleName = normalizeModuleName(options.module);
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const fileName = `${timestamp}_${snakeName}.lua`;
  const migrationName = `${timestamp}_${snakeName}`;
  const createdAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const serverRoot = requireServerRoot();
  const modulesDir = getShivaModulesDir(serverRoot);
  const moduleDir = path.join(modulesDir, moduleName);

  if (!fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module not found: ${moduleName}`));
    console.error(chalk.gray(`  Run \`shiva make:module ${moduleName}\` first.`));
    process.exit(1);
  }

  const migrationsDir = path.join(moduleDir, 'migrations');
  fs.mkdirSync(migrationsDir, { recursive: true });

  const destFile = path.join(migrationsDir, fileName);

  if (fs.existsSync(destFile)) {
    console.error(chalk.red(`✖ Migration already exists: ${destFile}`));
    process.exit(1);
  }

  const vars = {
    migration_name: migrationName,
    module_name: moduleName,
    snake_name: snakeName,
    created_at: createdAt,
  };

  writeTemplate('migration.lua.tpl', destFile, vars);

  console.log('');
  console.log(chalk.green(`✔ Created migration: ${chalk.bold(fileName)}`));
  console.log(chalk.gray(`  Path: ${path.relative(process.cwd(), destFile)}`));
  console.log('');
}

module.exports = makeMigrationCommand;
