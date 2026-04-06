'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

// Scaffolding
const initCommand          = require('./commands/init');
const makeModuleCommand    = require('./commands/make/module');
const makeServiceCommand   = require('./commands/make/service');
const makeModelCommand     = require('./commands/make/model');
const makeMigrationCommand = require('./commands/make/migration');
const makeTestCommand      = require('./commands/make/test');
const makeContractCommand  = require('./commands/make/contract');
const makeSeedCommand      = require('./commands/make/seed');

// Migrations
const migrateRunCommand      = require('./commands/migrate/run');
const migrateRollbackCommand = require('./commands/migrate/rollback');
const migrateStatusCommand   = require('./commands/migrate/status');

// Seeding
const seedCommand = require('./commands/seed');

// Module inspection
const moduleListCommand   = require('./commands/module/list');
const moduleStatusCommand = require('./commands/module/status');

// Config & locale
const configValidateCommand = require('./commands/config/validate');
const localeMissingCommand  = require('./commands/locale/missing');

// Package management
const installCommand  = require('./commands/install');
const updateCommand   = require('./commands/update');
const outdatedCommand = require('./commands/outdated');
const removeCommand   = require('./commands/remove');

// Testing
const testCommand = require('./commands/test');

// AI integration
const aiContextCommand = require('./commands/ai/context');
const aiLinkCommand    = require('./commands/ai/link');
const aiMcpCommand     = require('./commands/ai/mcp');

// MCP server
const mcpCommand = require('./commands/mcp');

// Docs
const docsBuildCommand  = require('./commands/docs/build');
const docsServeCommand  = require('./commands/docs/serve');
const docsApiCommand    = require('./commands/docs/api');
const docsDeployCommand = require('./commands/docs/deploy');

program
  .name('shiva')
  .description(chalk.cyan('Developer CLI for the Shiva FiveM framework'))
  .version(pkg.version, '-v, --version', 'Output the current version');

initCommand(program);

makeModuleCommand(program);
makeServiceCommand(program);
makeModelCommand(program);
makeMigrationCommand(program);
makeTestCommand(program);
makeContractCommand(program);
makeSeedCommand(program);

migrateRunCommand(program);
migrateRollbackCommand(program);
migrateStatusCommand(program);

seedCommand(program);

moduleListCommand(program);
moduleStatusCommand(program);

configValidateCommand(program);
localeMissingCommand(program);

installCommand(program);
updateCommand(program);
outdatedCommand(program);
removeCommand(program);

testCommand(program);

aiContextCommand(program);
aiLinkCommand(program);
aiMcpCommand(program);

mcpCommand(program);

docsBuildCommand(program);
docsServeCommand(program);
docsApiCommand(program);
docsDeployCommand(program);

program.addHelpText('after', `
${chalk.bold('Examples:')}
  $ shiva init
  $ shiva make:module fishing
  $ shiva make:service FishingService --module shiva-fishing
  $ shiva make:migration create_fish_catches --module shiva-fishing
  $ shiva migrate
  $ shiva module:list
  $ shiva install shiva-fishing
  $ shiva mcp start
`);

program.parse(process.argv);
