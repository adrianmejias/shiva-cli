'use strict';

const path  = require('path');
const fs    = require('fs');
const chalk = require('chalk');

const { requireServerRoot, getShivaModulesDir } = require('../utils/server-root');
const { readShivaConfig, writeShivaConfig }      = require('../utils/config-reader');
const { lockModule }                             = require('../packages/lockfile');
const { buildInstallPlan }                       = require('../packages/resolver');
const registry                                   = require('../packages/registry');

function installCommand(program) {
  program
    .command('install [module]')
    .description('Install a module (or all modules from shiva.json)')
    .option('--no-lock', 'Skip updating shiva.lock')
    .action(async (moduleName, options) => { await run(moduleName, options); });
}

async function run(moduleName, options) {
  const serverRoot = requireServerRoot();
  const config     = readShivaConfig(serverRoot);
  const regUrl     = registry.getRegistryUrl(config);

  let toInstall;

  if (moduleName) {
    const [name, version] = moduleName.split('@');
    toInstall = { [name]: version ? version : 'latest' };
  } else {
    toInstall = config.modules || {};
    if (Object.keys(toInstall).length === 0) {
      console.log(chalk.gray('  No modules declared in shiva.json.'));
      return;
    }
  }

  console.log('');
  console.log(chalk.bold('Resolving dependencies...'));

  let plan;
  try {
    plan = await buildInstallPlan(
      toInstall,
      (name) => registry.fetchVersions(regUrl, name),
      async (name, version) => {
        const meta = await registry.fetchModuleMeta(regUrl, name, version);
        return meta.dependencies || {};
      }
    );
  } catch (err) {
    console.error(chalk.red(`✖ Resolution failed: ${err.message}`));
    console.error(chalk.gray('  Is the registry reachable? Check your network or set "registry" in shiva.json.'));
    process.exit(1);
  }

  const modulesDir = getShivaModulesDir(serverRoot);
  fs.mkdirSync(modulesDir, { recursive: true });

  console.log('');
  for (const [name, version] of plan.entries()) {
    const destDir = path.join(modulesDir, name);

    if (version.startsWith('file:')) {
      const src = path.resolve(serverRoot, version.slice(5));
      console.log(chalk.gray(`  Linking ${name} → ${src}`));
      if (!fs.existsSync(destDir)) {
        fs.symlinkSync(src, destDir, 'dir');
      }
      continue;
    }

    if (fs.existsSync(destDir)) {
      console.log(chalk.gray(`  ${name}@${version} already installed, skipping`));
      continue;
    }

    process.stdout.write(chalk.gray(`  Installing ${name}@${version} ...`));
    try {
      const meta = await registry.fetchModuleMeta(regUrl, name, version);
      await registry.downloadModule(meta.downloadUrl, destDir);
      if (options.lock !== false) {
        lockModule(serverRoot, name, { version, resolved: meta.downloadUrl });
      }
      console.log(chalk.green(' done'));
    } catch (err) {
      console.log(chalk.red(' failed'));
      console.error(chalk.red(`    ${err.message}`));
    }
  }

  if (moduleName) {
    const [name] = moduleName.split('@');
    const resolved = plan.get(name);
    if (resolved && !config.modules[name]) {
      config.modules[name] = `^${resolved}`;
      writeShivaConfig(serverRoot, config);
      console.log(chalk.green(`\n✔ Added ${name}@^${resolved} to shiva.json`));
    }
  }

  console.log('');
  console.log(chalk.green(`✔ Done. ${plan.size} module(s) processed.`));
  console.log('');
}

module.exports = installCommand;
