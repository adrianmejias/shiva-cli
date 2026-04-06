'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

const initCommand = require('./commands/init');
const makeModuleCommand = require('./commands/make/module');
const makeServiceCommand = require('./commands/make/service');
const makeModelCommand = require('./commands/make/model');
const makeMigrationCommand = require('./commands/make/migration');
const migrateRunCommand = require('./commands/migrate/run');
const migrateRollbackCommand = require('./commands/migrate/rollback');
const migrateStatusCommand = require('./commands/migrate/status');

program
  .name('shiva')
  .description(chalk.cyan('Developer CLI for the Shiva FiveM framework'))
  .version(pkg.version, '-v, --version', 'Output the current version');

initCommand(program);
makeModuleCommand(program);
makeServiceCommand(program);
makeModelCommand(program);
makeMigrationCommand(program);
migrateRunCommand(program);
migrateRollbackCommand(program);
migrateStatusCommand(program);

program.addHelpText('after', `
${chalk.bold('Examples:')}
  $ shiva init
  $ shiva make:module fishing
  $ shiva make:service FishingService --module shiva-fishing
  $ shiva migrate
  $ shiva migrate:status
`);

program.parse(process.argv);
