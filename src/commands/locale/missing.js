'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');

const { requireServerRoot, getResourcesDir } = require('../../utils/server-root');
const { scanModules } = require('../../utils/lua-parser');

function localeMissingCommand(program) {
  program
    .command('locale:missing')
    .description('Find missing translation keys across module locales')
    .option('-l, --lang <lang>', 'Language to check against en', 'all')
    .action((options) => { run(options); });
}

function run(options) {
  const serverRoot   = requireServerRoot();
  const resourcesDir = getResourcesDir(serverRoot);
  const modules      = scanModules(resourcesDir);

  let totalMissing = 0;
  console.log('');

  for (const mod of modules) {
    const localesDir = path.join(mod.path, 'locales');
    if (!fs.existsSync(localesDir)) continue;

    const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.lua'));
    if (localeFiles.length === 0) continue;

    const enFile = path.join(localesDir, 'en.lua');
    if (!fs.existsSync(enFile)) continue;

    const enKeys = extractLocaleKeys(fs.readFileSync(enFile, 'utf-8'));
    if (enKeys.size === 0) continue;

    const otherFiles = localeFiles.filter(f => f !== 'en.lua');
    if (otherFiles.length === 0) continue;

    let modMissing = 0;
    for (const file of otherFiles) {
      const lang = file.replace('.lua', '');
      if (options.lang !== 'all' && lang !== options.lang) continue;

      const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
      const keys    = extractLocaleKeys(content);
      const missing = [...enKeys].filter(k => !keys.has(k));

      if (missing.length > 0) {
        if (modMissing === 0) {
          console.log(chalk.bold.cyan(`  ${mod.name}`));
        }
        console.log(chalk.yellow(`    [${lang}] ${missing.length} missing key(s):`));
        missing.forEach(k => console.log(chalk.gray(`      - ${k}`)));
        modMissing += missing.length;
        totalMissing += missing.length;
      }
    }
  }

  if (totalMissing === 0) {
    console.log(chalk.green('✔ All locale keys are present across all modules.'));
  } else {
    console.log('');
    console.log(chalk.yellow(`  ${totalMissing} missing key(s) found.`));
    process.exit(1);
  }
  console.log('');
}

function extractLocaleKeys(content) {
  const keys = new Set();
  const re   = /\['([^']+)'\]\s*=/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

module.exports = localeMissingCommand;
