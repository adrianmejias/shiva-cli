'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

const { requireServerRoot, getShivaModulesDir } = require('../../utils/server-root');
const { writeTemplate, toPascalCase, normalizeModuleName } = require('../../generators/index');

/**
 * Register the `shiva make:module` command.
 * @param {import('commander').Command} program
 */
function makeModuleCommand(program) {
  program
    .command('make:module <name>')
    .description('Scaffold a new Shiva module')
    .option('-d, --description <desc>', 'Module description')
    .option('-a, --author <author>', 'Module author')
    .option('--no-git', 'Skip .gitkeep files')
    .action(async (name, options) => {
      await run(name, options);
    });
}

async function run(rawName, options) {
  const moduleName = normalizeModuleName(rawName);
  const moduleShort = moduleName.replace(/^shiva-/, '');
  const PascalName = toPascalCase(moduleShort);

  let description = options.description;
  let author = options.author;

  if (!description || !author) {
    const answers = await inquirer.prompt([
      !description && {
        type: 'input',
        name: 'description',
        message: 'Module description:',
        default: `${PascalName} module for Shiva`,
      },
      !author && {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: '',
      },
    ].filter(Boolean));

    description = description || answers.description;
    author = author || answers.author || '';
  }

  const serverRoot = requireServerRoot();
  const modulesDir = getShivaModulesDir(serverRoot);
  const moduleDir = path.join(modulesDir, moduleName);

  if (fs.existsSync(moduleDir)) {
    console.error(chalk.red(`✖ Module already exists: ${moduleDir}`));
    process.exit(1);
  }

  const vars = {
    module_name: moduleName,
    module_short: moduleShort,
    PascalName,
    description,
    author,
  };

  const files = [
    ['module/fxmanifest.lua.tpl',     'fxmanifest.lua'],
    ['module/module.lua.tpl',         'module.lua'],
    ['module/client/init.lua.tpl',    'client/boot.lua'],
    ['module/server/init.lua.tpl',    'server/boot.lua'],
    ['module/shared/init.lua.tpl',    `shared/sh_${moduleShort}.lua`],
    ['module/config/config.lua.tpl',  'config/config.lua'],
    ['module/locales/en.lua.tpl',     'locales/en.lua'],
  ];

  for (const [tpl, dest] of files) {
    writeTemplate(tpl, path.join(moduleDir, dest), vars);
  }

  // Create empty directories with .gitkeep
  const emptyDirs = ['migrations', 'tests'];
  for (const dir of emptyDirs) {
    const dirPath = path.join(moduleDir, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    if (options.git !== false) {
      fs.writeFileSync(path.join(dirPath, '.gitkeep'), '', 'utf-8');
    }
  }

  console.log('');
  console.log(chalk.green(`✔ Created module: ${chalk.bold(moduleName)}`));
  console.log(chalk.gray(`  Path: ${path.relative(process.cwd(), moduleDir)}`));
  console.log('');
  console.log('  Files created:');
  for (const [, dest] of files) {
    console.log(chalk.gray(`    ${dest}`));
  }
  for (const dir of emptyDirs) {
    console.log(chalk.gray(`    ${dir}/`));
  }
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.gray(`  shiva make:service ${PascalName}Service --module ${moduleName}`));
  console.log(chalk.gray(`  shiva make:model ${PascalName} --module ${moduleName}`));
  console.log(chalk.gray(`  shiva make:migration create_${rawName.replace(/-/g, '_')}_table --module ${moduleName}`));
  console.log('');
}

module.exports = makeModuleCommand;
