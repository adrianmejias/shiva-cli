'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

const { writeShivaConfig } = require('../utils/config-reader');

const RECIPES = {
  minimal: require('../../recipes/minimal.json'),
  standard: require('../../recipes/standard.json'),
  'full-rp': require('../../recipes/full-rp.json'),
};

/**
 * Register the `shiva init` command.
 * @param {import('commander').Command} program
 */
function initCommand(program) {
  program
    .command('init')
    .description('Initialise a new Shiva server project in the current directory')
    .option('-r, --recipe <name>', 'Use a preset recipe (minimal | standard | full-rp)')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .action(async (options) => {
      await run(options);
    });
}

async function run(options) {
  const cwd = process.cwd();
  const existingConfig = path.join(cwd, 'shiva.json');

  if (fs.existsSync(existingConfig) && !options.yes) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: chalk.yellow('shiva.json already exists. Overwrite?'),
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.gray('Aborted.'));
      return;
    }
  }

  let answers;

  if (options.yes) {
    answers = {
      serverName: path.basename(cwd),
      recipe: options.recipe || 'minimal',
      dbHost: '127.0.0.1',
      dbPort: 3306,
      dbUser: 'root',
      dbPassword: '',
      dbName: 'shiva',
    };
  } else {
    answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverName',
        message: 'Server name:',
        default: path.basename(cwd),
        validate: (v) => v.trim().length > 0 || 'Server name cannot be empty',
      },
      {
        type: 'list',
        name: 'recipe',
        message: 'Choose a starter recipe:',
        default: options.recipe || 'minimal',
        choices: [
          { name: 'minimal     — 24 essential modules', value: 'minimal' },
          { name: 'standard    — 40 modules (recommended)', value: 'standard' },
          { name: 'full-rp     — 71 modules, full RP experience', value: 'full-rp' },
          { name: 'none        — start with no modules', value: 'none' },
        ],
      },
      {
        type: 'input',
        name: 'dbHost',
        message: 'Database host:',
        default: '127.0.0.1',
      },
      {
        type: 'number',
        name: 'dbPort',
        message: 'Database port:',
        default: 3306,
      },
      {
        type: 'input',
        name: 'dbUser',
        message: 'Database user:',
        default: 'root',
      },
      {
        type: 'password',
        name: 'dbPassword',
        message: 'Database password:',
        mask: '*',
      },
      {
        type: 'input',
        name: 'dbName',
        message: 'Database name:',
        default: 'shiva',
      },
    ]);
  }

  const recipeModules =
    answers.recipe !== 'none' && RECIPES[answers.recipe]
      ? RECIPES[answers.recipe].modules
      : {};

  const config = {
    name: answers.serverName,
    framework: 'shiva-core@^1.0.0',
    modules: recipeModules,
    database: {
      host: answers.dbHost,
      port: Number(answers.dbPort),
      user: answers.dbUser,
      password: answers.dbPassword,
      database: answers.dbName,
    },
  };

  writeShivaConfig(cwd, config);

  // Create resources/[shiva] directory structure
  const shivaDir = path.join(cwd, 'resources', '[shiva]');
  fs.mkdirSync(shivaDir, { recursive: true });

  const lockData = {
    version: 1,
    generatedAt: new Date().toISOString(),
    modules: {},
  };
  fs.writeFileSync(path.join(cwd, 'shiva.lock'), JSON.stringify(lockData, null, 2) + '\n', 'utf-8');

  console.log('');
  console.log(chalk.green('✔ Created shiva.json'));
  console.log(chalk.green('✔ Created shiva.lock'));
  console.log(chalk.green('✔ Created resources/[shiva]/'));
  console.log('');

  if (answers.recipe !== 'none') {
    const moduleCount = Object.keys(recipeModules).length;
    console.log(chalk.cyan(`  Recipe: ${answers.recipe} (${moduleCount} modules)`));
    console.log(chalk.gray('  Run `shiva install` to download and install the modules.'));
  }

  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.gray('  shiva install        # Install modules from shiva.json'));
  console.log(chalk.gray('  shiva migrate        # Run database migrations'));
  console.log(chalk.gray('  shiva module:list    # List installed modules'));
  console.log('');
}

module.exports = initCommand;
