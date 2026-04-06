'use strict';

const chalk = require('chalk');

function mcpCommand(program) {
  const mcp = program
    .command('mcp')
    .description('MCP server commands');

  mcp
    .command('start')
    .description('Start the Shiva MCP server (stdio transport)')
    .option('-p, --port <port>', 'Port (reserved for future HTTP transport)', '3100')
    .action(async (options) => {
      const { startMcpServer } = require('../mcp/server');
      process.stderr.write(chalk.cyan('Shiva MCP server starting on stdio...\n'));
      try {
        await startMcpServer(options);
      } catch (err) {
        process.stderr.write(chalk.red(`MCP server error: ${err.message}\n`));
        process.exit(1);
      }
    });
}

module.exports = mcpCommand;
