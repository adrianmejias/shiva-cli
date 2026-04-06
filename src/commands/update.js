'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir, getResourcesDir } = require('../utils/server-root');
const { readShivaConfig } = require('../utils/config-reader');
const { readLockfile, lockModule } = require('../packages/lockfile');
const { resolveVersion } = require('../packages/resolver');
const registry = require('../packages/registry');
const { scanModules } = require('../utils/lua-parser');
const { normalizeModuleName } = require('../generators/index');

function updateCommand(program) {
  program
    .command('update [module]')
    .description('Update installed modules to the latest compatible version')
    .action(async (moduleName) => { await run(moduleName); });
}

async function run(moduleName) {
  const serverRoot = requireServerRoot();
  const config     = readShivaConfig(serverRoot);
  const lock       = readLockfile(serverRoot);
  const regUrl     = registry.getRegistryUrl(config);

  let targets = Object.entries(config.modules || {});
  if (moduleName) {
    const name = normalizeModuleName(moduleName);
    targets    = targets.filter(([n]) => n === name);
    if (targets.length === 0) {
      console.error(chalk.red(`✖ ${name} not found in shiva.json`));
      process.exit(1);
    }
  }

  console.log('');
  let updated = 0;

  for (const [name, constraint] of targets) {
    if (constraint.startsWith('file:')) {
      console.log(chalk.gray(`  ${name}: file reference, skipping`));
      continue;
    }

    let versions;
    try {
      versions = await registry.fetchVersions(regUrl, name);
    } catch (err) {
      console.log(chalk.red(`  ${name}: failed to fetch versions — ${err.message}`));
      continue;
    }

    const latest  = resolveVersion(versions, constraint);
    const current = lock.modules[name]?.version;

    if (!latest) {
      console.log(chalk.yellow(`  ${name}: no version matching ${constraint}`));
      continue;
    }

    if (current === latest) {
      console.log(chalk.gray(`  ${name}@${latest} already up to date`));
      continue;
    }

    const destDir = path.join(getShivaModulesDir(serverRoot), name);
    process.stdout.write(chalk.gray(`  Updating ${name} ${current || '?'} → ${latest} ...`));

    try {
      const meta = await registry.fetchModuleMeta(regUrl, name, latest);
      if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
      await registry.downloadModule(meta.downloadUrl, destDir);
      lockModule(serverRoot, name, { version: latest, resolved: meta.downloadUrl });
      console.log(chalk.green(' done'));
      updated++;
    } catch (err) {
      console.log(chalk.red(' failed'));
      console.error(chalk.red(`    ${err.message}`));
    }
  }

  console.log('');
  console.log(updated > 0
    ? chalk.green(`✔ Updated ${updated} module(s).`)
    : chalk.gray('  Everything is up to date.'));
  console.log('');
}

module.exports = updateCommand;
