'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');

const { requireServerRoot, getResourcesDir } = require('../../utils/server-root');
const { scanModules } = require('../../utils/lua-parser');

function moduleStatusCommand(program) {
  program
    .command('module:status')
    .description('Show detailed status for all installed modules')
    .option('-m, --module <name>', 'Show status for a specific module only')
    .action((options) => { run(options); });
}

function run(options) {
  const serverRoot   = requireServerRoot();
  const resourcesDir = getResourcesDir(serverRoot);
  let modules        = scanModules(resourcesDir);

  if (options.module) {
    const filter = options.module.startsWith('shiva-') ? options.module : `shiva-${options.module}`;
    modules = modules.filter(m => m.name === filter);
    if (modules.length === 0) {
      console.error(chalk.red(`✖ Module not found: ${filter}`));
      process.exit(1);
    }
  }

  if (modules.length === 0) {
    console.log(chalk.gray('\n  No modules found.\n'));
    return;
  }

  console.log('');
  for (const mod of modules) {
    const m = mod.manifest;
    const migrationsDir = path.join(mod.path, 'migrations');
    const migrationCount = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.lua')).length
      : 0;

    const testsDir = path.join(mod.path, 'tests');
    const testCount = fs.existsSync(testsDir)
      ? fs.readdirSync(testsDir).filter(f => f.endsWith('_spec.lua')).length
      : 0;

    console.log(chalk.bold.cyan(`  ${mod.name}`));
    console.log(chalk.gray(`  ${'─'.repeat(50)}`));
    console.log(`    Version      : ${chalk.white(m.version || '?')}`);
    console.log(`    Description  : ${chalk.gray(m.description || '—')}`);
    console.log(`    Path         : ${chalk.gray(mod.path)}`);
    console.log(`    Dependencies : ${(m.dependencies || []).length > 0 ? (m.dependencies || []).join(', ') : chalk.gray('none')}`);
    console.log(`    Provides     : ${(m.provides || []).length > 0 ? (m.provides || []).join(', ') : chalk.gray('none')}`);
    console.log(`    Migrations   : ${migrationCount}`);
    console.log(`    Tests        : ${testCount}`);
    console.log(`    Events       : ${(m.events || []).length}`);
    console.log('');
  }
}

module.exports = moduleStatusCommand;
