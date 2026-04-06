'use strict';

const { scanModules }     = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

module.exports = {
  name: 'shiva:getRegisteredEvents',
  description: 'Get all events declared across installed modules',
  inputSchema: { type: 'object', properties: {}, required: [] },

  async handler(_, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules = scanModules(getResourcesDir(serverRoot));
    const events  = [];

    for (const mod of modules) {
      for (const event of (mod.manifest.events || [])) {
        events.push({ module: mod.name, event });
      }
    }

    if (events.length === 0) return 'No events declared in installed modules.';
    return events;
  },
};
