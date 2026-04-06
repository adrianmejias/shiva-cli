'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');

const { requireServerRoot, getResourcesDir } = require('../../utils/server-root');
const { scanModules } = require('../../utils/lua-parser');

function configValidateCommand(program) {
  program
    .command('config:validate')
    .description('Validate module configuration files')
    .action(() => { run(); });
}

function run() {
  const serverRoot   = requireServerRoot();
  const resourcesDir = getResourcesDir(serverRoot);
  const modules      = scanModules(resourcesDir);

  let passed = 0;
  let warned = 0;
  let failed = 0;

  console.log('');
  console.log(chalk.bold('Config Validation'));
  console.log(chalk.gray('─'.repeat(60)));

  for (const mod of modules) {
    const configFile = path.join(mod.path, 'config', 'config.lua');

    if (!fs.existsSync(configFile)) {
      console.log(chalk.yellow(`  ⚠  ${mod.name.padEnd(28)} no config/config.lua`));
      warned++;
      continue;
    }

    const content = fs.readFileSync(configFile, 'utf-8');

    if (!content.includes('Config.register(')) {
      console.log(chalk.yellow(`  ⚠  ${mod.name.padEnd(28)} Config.register() not found`));
      warned++;
      continue;
    }

    const hasPlaceholder = /--\s*TODO/.test(content) && !/Config\.register\([^)]+,\s*\{[^}]+\}/.test(content);
    if (hasPlaceholder) {
      console.log(chalk.yellow(`  ⚠  ${mod.name.padEnd(28)} config appears to be a stub`));
      warned++;
      continue;
    }

    console.log(chalk.green(`  ✔  ${mod.name}`));
    passed++;
  }

  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  ${chalk.green(passed + ' passed')}  ·  ${chalk.yellow(warned + ' warnings')}  ·  ${chalk.red(failed + ' failed')}`);
  console.log('');

  if (failed > 0) process.exit(1);
}

module.exports = configValidateCommand;
