'use strict';

const path = require('path');
const chalk = require('chalk');

const { requireServerRoot, getResourcesDir } = require('../../utils/server-root');
const { scanModules } = require('../../utils/lua-parser');

function moduleListCommand(program) {
  program
    .command('module:list')
    .description('List all installed Shiva modules')
    .action(() => { run(); });
}

function run() {
  const serverRoot   = requireServerRoot();
  const resourcesDir = getResourcesDir(serverRoot);
  const modules      = scanModules(resourcesDir);

  console.log('');
  if (modules.length === 0) {
    console.log(chalk.gray('  No modules found. Run `shiva install` to install modules.'));
    console.log('');
    return;
  }

  const nameW = Math.max(20, ...modules.map(m => m.name.length)) + 2;
  const verW  = 10;

  console.log(chalk.bold(`  ${'Module'.padEnd(nameW)} ${'Version'.padEnd(verW)} Dependencies`));
  console.log(chalk.gray('  ' + '─'.repeat(nameW + verW + 30)));

  for (const mod of modules) {
    const name    = mod.name.padEnd(nameW);
    const version = (mod.manifest.version || '?').padEnd(verW);
    const deps    = (mod.manifest.dependencies || []).join(', ') || chalk.gray('—');
    console.log(`  ${chalk.cyan(name)} ${chalk.gray(version)} ${deps}`);
  }

  console.log('');
  console.log(chalk.gray(`  ${modules.length} module(s) installed.`));
  console.log('');
}

module.exports = moduleListCommand;
