'use strict';

const chalk = require('chalk');
const { requireServerRoot } = require('../utils/server-root');
const { readShivaConfig }   = require('../utils/config-reader');
const { readLockfile }      = require('../packages/lockfile');
const { resolveVersion }    = require('../packages/resolver');
const registry              = require('../packages/registry');

function outdatedCommand(program) {
  program
    .command('outdated')
    .description('Show modules with available updates')
    .action(async () => { await run(); });
}

async function run() {
  const serverRoot = requireServerRoot();
  const config     = readShivaConfig(serverRoot);
  const lock       = readLockfile(serverRoot);
  const regUrl     = registry.getRegistryUrl(config);
  const modules    = config.modules || {};

  console.log('');

  const rows = [];
  for (const [name, constraint] of Object.entries(modules)) {
    if (constraint.startsWith('file:')) continue;
    let versions;
    try { versions = await registry.fetchVersions(regUrl, name); } catch { continue; }
    const latest  = resolveVersion(versions, 'latest');
    const wanted  = resolveVersion(versions, constraint);
    const current = lock.modules[name]?.version || chalk.gray('not installed');
    if (latest && latest !== current) {
      rows.push({ name, current, wanted: wanted || '?', latest });
    }
  }

  if (rows.length === 0) {
    console.log(chalk.green('✔ All modules are up to date.'));
    console.log('');
    return;
  }

  const nw = Math.max(20, ...rows.map(r => r.name.length)) + 2;
  console.log(chalk.bold(`  ${'Module'.padEnd(nw)} ${'Current'.padEnd(12)} ${'Wanted'.padEnd(12)} Latest`));
  console.log(chalk.gray('  ' + '─'.repeat(nw + 38)));
  for (const r of rows) {
    console.log(
      `  ${chalk.cyan(r.name.padEnd(nw))} ` +
      `${chalk.gray(String(r.current).padEnd(12))} ` +
      `${chalk.yellow(String(r.wanted).padEnd(12))} ` +
      `${chalk.green(r.latest)}`
    );
  }
  console.log('');
}

module.exports = outdatedCommand;
