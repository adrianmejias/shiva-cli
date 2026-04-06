'use strict';

const fs   = require('fs');
const path = require('path');

const { scanModules }     = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

module.exports = {
  name: 'shiva:searchDocs',
  description: 'Full-text search across AGENTS.md files in installed modules',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },

  async handler({ query }, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules = scanModules(getResourcesDir(serverRoot));
    const results = [];
    const q       = query.toLowerCase();

    for (const mod of modules) {
      const agentsFile = path.join(mod.path, 'AGENTS.md');
      if (!fs.existsSync(agentsFile)) continue;
      const content = fs.readFileSync(agentsFile, 'utf-8');
      if (!content.toLowerCase().includes(q)) continue;
      const lines = content.split('\n').filter(l => l.toLowerCase().includes(q));
      results.push({ module: mod.name, matches: lines.slice(0, 5) });
    }

    return results.length > 0 ? results : `No documentation matches for "${query}"`;
  },
};
