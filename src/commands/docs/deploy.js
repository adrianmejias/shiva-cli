'use strict';

const chalk = require('chalk');

function docsDeployCommand(program) {
  program.command('docs:deploy').description('Deploy documentation to hosting').action(() => {
    console.log('');
    console.log(chalk.cyan('docs:deploy is managed in the shiva-docs repository.'));
    console.log(chalk.gray('  cd shiva-docs && npm run deploy'));
    console.log('');
  });
}

module.exports = docsDeployCommand;
