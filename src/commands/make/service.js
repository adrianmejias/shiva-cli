'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir } = require('../../utils/server-root');
const { writeTemplate, toPascalCase, normalizeModuleName } = require('../../generators/index');

/**
 * Register the `shiva make:service` command.
 * @param {import('commander').Command} program
 */
function makeServiceCommand(program) {
  program
    .command('make:service <name>')
    .description('Scaffold a new service inside a module')
    .requiredOption('-m, --module <module>', 'Target module name')
    .action((name, options) => {
      run(name, options);
    });
}

function run(rawName, options) {
  const ServiceName = toPascalCase(rawName);
  const moduleName = normalizeModuleName(options.module);

  const serverRoot = requireServerRoot();
  const modulesDir = getShivaModulesDir(serverRoot);
  const moduleDir = path.join(modulesDir, moduleName);

  if (!fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module not found: ${moduleName}`));
    console.error(chalk.gray(`  Expected path: ${moduleDir}`));
    console.error(chalk.gray(`  Run \`shiva make:module ${moduleName}\` first.`));
    process.exit(1);
  }

  const destDir = path.join(moduleDir, 'server', 'services');
  const destFile = path.join(destDir, `${ServiceName}.lua`);

  if (fs.existsSync(destFile)) {
    console.error(chalk.red(`✖ Service already exists: ${destFile}`));
    process.exit(1);
  }

  const vars = {
    ServiceName,
    module_name: moduleName,
  };

  writeTemplate('service.lua.tpl', destFile, vars);

  console.log('');
  console.log(chalk.green(`✔ Created service: ${chalk.bold(ServiceName)}`));
  console.log(chalk.gray(`  Path: ${path.relative(process.cwd(), destFile)}`));
  console.log('');
}

module.exports = makeServiceCommand;
