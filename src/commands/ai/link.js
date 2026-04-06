'use strict';

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk');
const { requireServerRoot } = require('../../utils/server-root');

function aiLinkCommand(program) {
  program
    .command('ai:link')
    .description('Create CLAUDE.md and GEMINI.md symlinks pointing at AGENTS.md')
    .action(() => { run(); });
}

function run() {
  const serverRoot = requireServerRoot();
  const agentsFile = path.join(serverRoot, 'AGENTS.md');
  const targets    = ['CLAUDE.md', 'GEMINI.md'];

  if (!fs.existsSync(agentsFile)) {
    console.error(chalk.red('✖ AGENTS.md not found. Run `shiva ai:context` first.'));
    process.exit(1);
  }

  console.log('');
  for (const target of targets) {
    const linkPath = path.join(serverRoot, target);
    try {
      const stat = fs.lstatSync(linkPath);
      if (stat) fs.unlinkSync(linkPath);
    } catch {}
    fs.symlinkSync('AGENTS.md', linkPath);
    console.log(chalk.green(`✔ ${target} → AGENTS.md`));
  }
  console.log('');
}

module.exports = aiLinkCommand;
