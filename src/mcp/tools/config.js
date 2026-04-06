'use strict';

const fs   = require('fs');
const path = require('path');

const { scanModules }     = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

module.exports = {
  name: 'shiva:getModuleConfig',
  description: 'Get the configuration file and schema for a module',
  inputSchema: {
    type: 'object',
    properties: {
      module: { type: 'string', description: 'Module name, e.g. shiva-economy or economy' },
    },
    required: ['module'],
  },

  async handler({ module: moduleName }, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules = scanModules(getResourcesDir(serverRoot));
    const mod     = modules.find(m =>
      m.name === moduleName ||
      m.name === `shiva-${moduleName}` ||
      m.name.endsWith(`-${moduleName}`)
    );
    if (!mod) return `Module not found: ${moduleName}`;

    const configFile  = path.join(mod.path, 'config', 'config.lua');
    const schemaFile  = path.join(mod.path, 'config', 'config.schema.lua');
    const result      = { module: mod.name, path: mod.path };

    if (fs.existsSync(configFile)) {
      result.config = fs.readFileSync(configFile, 'utf-8');
    } else {
      result.config = null;
    }

    if (fs.existsSync(schemaFile)) {
      result.schema = fs.readFileSync(schemaFile, 'utf-8');
    } else {
      result.schema = null;
    }

    if (!result.config && !result.schema) {
      return `No config files found for ${moduleName}`;
    }

    return result;
  },
};
