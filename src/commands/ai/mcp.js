'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');
const { requireServerRoot } = require('../../utils/server-root');
const { readShivaConfig }   = require('../../utils/config-reader');

function aiMcpCommand(program) {
  program
    .command('ai:mcp')
    .description('Generate .mcp.json for AI tool integrations')
    .option('-p, --port <port>', 'MCP server port', '3100')
    .action((options) => { run(options); });
}

function run(options) {
  const serverRoot = requireServerRoot();
  const mcpJson    = {
    mcpServers: {
      shiva: {
        command: 'shiva',
        args:    ['mcp', 'start'],
        env:     {},
      },
    },
  };

  const outPath = path.join(serverRoot, '.mcp.json');
  fs.writeFileSync(outPath, JSON.stringify(mcpJson, null, 2) + '\n', 'utf-8');

  console.log('');
  console.log(chalk.green('✔ Created .mcp.json'));
  console.log(chalk.gray('  Add this to your Claude Code / Cursor / Windsurf MCP config.'));
  console.log(chalk.gray('  Start the server with: shiva mcp start'));
  console.log('');
}

module.exports = aiMcpCommand;
