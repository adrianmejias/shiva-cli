'use strict';

const fs    = require('fs');
const path  = require('path');
const chalk = require('chalk');

const { findServerRoot, getResourcesDir } = require('../../utils/server-root');
const { scanModules }                     = require('../../utils/lua-parser');
const { scanModuleAnnotations, toMarkdown } = require('../../utils/lua-annotations');

function docsApiCommand(program) {
  program
    .command('docs:api')
    .description('Generate API reference from LuaLS annotations')
    .option('-m, --module <name>', 'Generate for a specific module only')
    .option('-o, --out <dir>',     'Output directory (default: ./docs/api)')
    .action(async (options) => { await run(options); });
}

async function run(options) {
  const serverRoot = findServerRoot(process.cwd());
  if (!serverRoot) {
    console.error(chalk.red('✖ Not in a Shiva server project. Run shiva init first.'));
    process.exit(1);
  }

  let modules = scanModules(getResourcesDir(serverRoot));
  if (options.module) {
    const name = options.module.startsWith('shiva-') ? options.module : `shiva-${options.module}`;
    modules    = modules.filter(m => m.name === name || m.name === options.module);
    if (modules.length === 0) {
      console.error(chalk.red(`✖ Module not found: ${options.module}`));
      process.exit(1);
    }
  }

  const outDir = options.out
    ? path.resolve(options.out)
    : path.join(serverRoot, 'docs', 'api');

  fs.mkdirSync(outDir, { recursive: true });

  console.log('');
  console.log(chalk.bold(`Scanning ${modules.length} module(s) for LuaLS annotations...\n`));

  let totalClasses = 0;
  let totalFns     = 0;
  let generated    = 0;

  for (const mod of modules) {
    const api = scanModuleAnnotations(mod.path);
    if (api.classes.length === 0 && api.functions.length === 0) {
      console.log(chalk.gray(`  ${mod.name}  — no annotations found, skipping`));
      continue;
    }

    totalClasses += api.classes.length;
    totalFns     += api.functions.length;

    const markdown  = toMarkdown(mod.name, api);
    const outFile   = path.join(outDir, `${mod.name}.md`);
    fs.writeFileSync(outFile, markdown, 'utf-8');

    console.log(
      chalk.green(`  ✔ ${mod.name}`) +
      chalk.gray(` — ${api.classes.length} classes, ${api.functions.length} functions → ${path.relative(serverRoot, outFile)}`)
    );
    generated++;
  }

  if (generated === 0) {
    console.log(chalk.yellow('\n  No annotated modules found. Add ---@param / ---@return / ---@class to your Lua files.\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold(`Generated ${generated} API doc file(s) in ${path.relative(process.cwd(), outDir)}/`));
  console.log(chalk.gray(`  ${totalClasses} classes, ${totalFns} functions documented\n`));
}

module.exports = docsApiCommand;
