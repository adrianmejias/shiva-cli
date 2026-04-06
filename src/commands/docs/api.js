'use strict';

const chalk = require('chalk');

function docsApiCommand(program) {
  program.command('docs:api').description('Generate API reference from LuaLS annotations').action(() => {
    console.log('');
    console.log(chalk.cyan('docs:api — LuaLS annotation parsing coming soon.'));
    console.log(chalk.gray('  This will scan ---@class, ---@field, ---@param, ---@return annotations'));
    console.log(chalk.gray('  across all installed modules and generate markdown API docs.'));
    console.log('');
  });
}

module.exports = docsApiCommand;
