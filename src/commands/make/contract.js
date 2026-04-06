'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { requireServerRoot } = require('../../utils/server-root');
const { writeTemplate, toPascalCase, toSnakeCase } = require('../../generators/index');

function makeContractCommand(program) {
  program
    .command('make:contract <name>')
    .description('Scaffold a new service contract')
    .action((name) => { run(name); });
}

function run(rawName) {
  const ContractName = toPascalCase(rawName);
  const contractSlug = toSnakeCase(rawName).replace(/-/g, '_');
  const moduleShort  = contractSlug;
  const fileName     = `sh_${contractSlug}.lua`;

  const serverRoot   = requireServerRoot();
  const contractsDir = path.join(serverRoot, 'shared', 'contracts');
  const destFile     = path.join(contractsDir, fileName);

  if (fs.existsSync(destFile)) {
    console.error(chalk.red(`✖ Contract already exists: ${destFile}`));
    process.exit(1);
  }

  writeTemplate('contract.lua.tpl', destFile, {
    ContractName,
    module_short: moduleShort,
  });

  console.log('');
  console.log(chalk.green(`✔ Created contract: ${chalk.bold(ContractName)}`));
  console.log(chalk.gray(`  Path: ${path.relative(process.cwd(), destFile)}`));
  console.log('');
  console.log(chalk.gray('  Register it in your fxmanifest shared_scripts and module.lua provides.'));
  console.log('');
}

module.exports = makeContractCommand;
