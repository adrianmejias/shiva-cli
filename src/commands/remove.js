'use strict';

const path     = require('path');
const fs       = require('fs');
const chalk    = require('chalk');
const inquirer = require('inquirer');

const { requireServerRoot, getShivaModulesDir, getResourcesDir } = require('../utils/server-root');
const { readShivaConfig, writeShivaConfig } = require('../utils/config-reader');
const { unlockModule } = require('../packages/lockfile');
const { scanModules }  = require('../utils/lua-parser');
const { normalizeModuleName } = require('../generators/index');

function removeCommand(program) {
  program
    .command('remove <module>')
    .description('Remove an installed module')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (moduleName, options) => { await run(moduleName, options); });
}

async function run(rawName, options) {
  const serverRoot = requireServerRoot();
  const name       = normalizeModuleName(rawName);
  const moduleDir  = path.join(getShivaModulesDir(serverRoot), name);

  if (!fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module not found: ${name}`));
    process.exit(1);
  }

  const modules    = scanModules(getResourcesDir(serverRoot));
  const dependents = modules.filter(m => (m.manifest.dependencies || []).includes(name));
  if (dependents.length > 0) {
    console.log('');
    console.log(chalk.yellow(`  ⚠  The following modules depend on ${name}:`));
    dependents.forEach(m => console.log(chalk.yellow(`     - ${m.name}`)));
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm', name: 'confirm',
      message: `Remove ${chalk.bold(name)}?`,
      default: false,
    }]);
    if (!confirm) { console.log(chalk.gray('Aborted.')); return; }
  }

  fs.rmSync(moduleDir, { recursive: true, force: true });
  unlockModule(serverRoot, name);

  const config = readShivaConfig(serverRoot);
  delete config.modules[name];
  writeShivaConfig(serverRoot, config);

  console.log('');
  console.log(chalk.green(`✔ Removed ${name}`));
  console.log('');
}

module.exports = removeCommand;
