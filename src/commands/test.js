'use strict';

const path = require('path');
const fs   = require('fs');
const { execSync } = require('child_process');
const chalk = require('chalk');

const { requireServerRoot, getResourcesDir } = require('../utils/server-root');
const { scanModules } = require('../utils/lua-parser');
const { normalizeModuleName } = require('../generators/index');

function testCommand(program) {
  program
    .command('test')
    .description('Run module test suites')
    .option('-m, --module <module>', 'Run tests for a specific module')
    .option('-f, --filter <pattern>', 'Filter test files by name pattern')
    .action(async (options) => { await run(options); });
}

async function run(options) {
  const serverRoot   = requireServerRoot();
  const resourcesDir = getResourcesDir(serverRoot);
  let   modules      = scanModules(resourcesDir);

  if (options.module) {
    const name = normalizeModuleName(options.module);
    modules    = modules.filter(m => m.name === name);
    if (modules.length === 0) {
      console.error(chalk.red(`✖ Module not found: ${name}`));
      process.exit(1);
    }
  }

  const specs = collectSpecs(modules, options.filter);

  if (specs.length === 0) {
    console.log(chalk.gray('\n  No test specs found (_spec.lua files in tests/ directories).\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold(`Running ${specs.length} spec file(s)...\n`));

  let passed = 0;
  let failed = 0;

  for (const spec of specs) {
    process.stdout.write(chalk.gray(`  ${spec.label} ...`));
    try {
      execSync(`lua ${spec.path}`, { stdio: 'pipe', cwd: path.dirname(spec.path) });
      console.log(chalk.green(' pass'));
      passed++;
    } catch (err) {
      console.log(chalk.red(' fail'));
      const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
      output.split('\n').filter(Boolean).forEach(l => console.log(chalk.red(`    ${l}`)));
      failed++;
    }
  }

  console.log('');
  console.log(
    failed === 0
      ? chalk.green(`✔ All ${passed} spec(s) passed.`)
      : chalk.red(`✖ ${failed} failed, ${passed} passed.`)
  );
  console.log('');

  if (failed > 0) process.exit(1);
}

function collectSpecs(modules, filter) {
  const specs = [];
  for (const mod of modules) {
    const testsDir = path.join(mod.path, 'tests');
    if (!fs.existsSync(testsDir)) continue;
    const files = fs.readdirSync(testsDir)
      .filter(f => f.endsWith('_spec.lua'))
      .filter(f => !filter || f.includes(filter));
    for (const file of files) {
      specs.push({ label: `${mod.name}/${file}`, path: path.join(testsDir, file) });
    }
  }
  return specs;
}

module.exports = testCommand;
