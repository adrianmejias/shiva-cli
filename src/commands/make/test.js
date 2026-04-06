'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir } = require('../../utils/server-root');
const { writeTemplate, toPascalCase, toSnakeCase, normalizeModuleName } = require('../../generators/index');

function makeTestCommand(program) {
  program
    .command('make:test <name>')
    .description('Scaffold a test spec file inside a module')
    .requiredOption('-m, --module <module>', 'Target module name')
    .action((name, options) => { run(name, options); });
}

function run(rawName, options) {
  const moduleName   = normalizeModuleName(options.module);
  const moduleShort  = moduleName.replace(/^shiva-/, '');
  const testName     = toSnakeCase(rawName).replace(/-/g, '_');
  const describeName = toPascalCase(rawName);

  const serverRoot = requireServerRoot();
  const modulesDir = getShivaModulesDir(serverRoot);
  const moduleDir  = path.join(modulesDir, moduleName);

  if (!fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module not found: ${moduleName}`));
    process.exit(1);
  }

  const destFile = path.join(moduleDir, 'tests', `${testName}_spec.lua`);
  if (fs.existsSync(destFile)) {
    console.error(chalk.red(`✖ Test already exists: ${destFile}`));
    process.exit(1);
  }

  writeTemplate('test.lua.tpl', destFile, {
    test_name:     testName,
    describe_name: describeName,
    module_name:   moduleName,
    module_short:  moduleShort,
  });

  console.log('');
  console.log(chalk.green(`✔ Created test: ${chalk.bold(testName + '_spec.lua')}`));
  console.log(chalk.gray(`  Path: ${path.relative(process.cwd(), destFile)}`));
  console.log(chalk.gray(`  Run:  shiva test --module ${moduleName}`));
  console.log('');
}

module.exports = makeTestCommand;
