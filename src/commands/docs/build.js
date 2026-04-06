'use strict';

const chalk = require('chalk');

function docsBuildCommand(program) {
  program.command('docs:build').description('Build the VitePress documentation site').action(() => {
    console.log('');
    console.log(chalk.cyan('docs:build is managed in the shiva-docs repository.'));
    console.log(chalk.gray('  cd shiva-docs && npm run build'));
    console.log('');
  });
}

module.exports = docsBuildCommand;
