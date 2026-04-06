'use strict';

const fs   = require('fs');
const path = require('path');

module.exports = {
  name: 'shiva:getContractMethods',
  description: 'Get methods defined in a Shiva contract file',
  inputSchema: {
    type: 'object',
    properties: {
      contract: { type: 'string', description: 'Contract name, e.g. Economy' },
    },
    required: ['contract'],
  },

  async handler({ contract }, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    // Check project-level contracts first, then shiva-core contracts
    const slug  = contract.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const tries = [
      path.join(serverRoot, 'shared', 'contracts', `sh_${slug}.lua`),
      path.join(serverRoot, 'shared', 'sh_contracts', `sh_${slug}.lua`),
      path.join(serverRoot, 'resources', '[shiva]', 'shiva-core', 'shared', 'sh_contracts', `sh_${slug}.lua`),
    ];

    for (const file of tries) {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        return { file: path.relative(serverRoot, file), content: raw };
      }
    }

    return `Contract not found: sh_${slug}.lua — tried ${tries.map(t => path.relative(serverRoot, t)).join(', ')}`;
  },
};
