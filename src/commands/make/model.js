'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir } = require('../../utils/server-root');
const { writeTemplate, toPascalCase, toSnakeCase, normalizeModuleName } = require('../../generators/index');

/**
 * Register the `shiva make:model` command.
 * @param {import('commander').Command} program
 */
function makeModelCommand(program) {
  program
    .command('make:model <name>')
    .description('Scaffold a new model inside a module')
    .requiredOption('-m, --module <module>', 'Target module name')
    .option('-t, --table <table>', 'Override database table name')
    .action((name, options) => {
      run(name, options);
    });
}

function run(rawName, options) {
  const ModelName = toPascalCase(rawName);
  const moduleName = normalizeModuleName(options.module);
  const tableName = options.table || toSnakeCase(rawName) + 's';

  const serverRoot = requireServerRoot();
  const modulesDir = getShivaModulesDir(serverRoot);
  const moduleDir = path.join(modulesDir, moduleName);

  if (!fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module not found: ${moduleName}`));
    console.error(chalk.gray(`  Run \`shiva make:module ${moduleName}\` first.`));
    process.exit(1);
  }

  const destDir = path.join(moduleDir, 'server', 'models');
  const destFile = path.join(destDir, `${ModelName}.lua`);

  if (fs.existsSync(destFile)) {
    console.error(chalk.red(`✖ Model already exists: ${destFile}`));
    process.exit(1);
  }

  const vars = {
    ModelName,
    module_name: moduleName,
    table_name: tableName,
  };

  writeTemplate('model.lua.tpl', destFile, vars);

  console.log('');
  console.log(chalk.green(`✔ Created model: ${chalk.bold(ModelName)}`));
  console.log(chalk.gray(`  Table:  ${tableName}`));
  console.log(chalk.gray(`  Path:   ${path.relative(process.cwd(), destFile)}`));
  console.log('');
}

module.exports = makeModelCommand;
