'use strict';

const { scanModules } = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

module.exports = {
  name: 'shiva:getInstalledModules',
  description: 'List all installed Shiva modules with version, dependencies, and provided contracts',
  inputSchema: { type: 'object', properties: {}, required: [] },

  async handler(_, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';
    const modules = scanModules(getResourcesDir(serverRoot));
    if (modules.length === 0) return 'No Shiva modules found in resources/[shiva]/';
    return modules.map(m => ({
      name:         m.name,
      version:      m.manifest.version,
      description:  m.manifest.description,
      dependencies: m.manifest.dependencies || [],
      provides:     m.manifest.provides || [],
      events:       m.manifest.events || [],
      migrations:   (m.manifest.migrations || []).length,
    }));
  },
};
