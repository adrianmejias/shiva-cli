'use strict';

const chalk = require('chalk');

function docsServeCommand(program) {
  program.command('docs:serve').description('Serve the documentation site locally').action(() => {
    console.log('');
    console.log(chalk.cyan('docs:serve is managed in the shiva-docs repository.'));
    console.log(chalk.gray('  cd shiva-docs && npm run dev'));
    console.log('');
  });
}

module.exports = docsServeCommand;
