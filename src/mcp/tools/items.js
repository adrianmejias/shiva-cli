'use strict';

const fs   = require('fs');
const path = require('path');

const { scanModules }     = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively collect all .lua files under a directory.
 * @param {string} dir
 * @param {string[]} [results]
 * @returns {string[]}
 */
function collectLuaFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectLuaFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.lua')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract inline string values from a Lua table field, e.g.
 *   label = 'Bread'  →  'Bread'
 * @param {string} block
 * @param {string} field
 * @returns {string|null}
 */
function extractField(block, field) {
  const re    = new RegExp(`${field}\\s*=\\s*['"]([^'"]+)['"]`);
  const match = block.match(re);
  return match ? match[1] : null;
}

/**
 * Extract a numeric field from a Lua table block.
 * @param {string} block
 * @param {string} field
 * @returns {number|null}
 */
function extractNumber(block, field) {
  const re    = new RegExp(`${field}\\s*=\\s*(\\d+(?:\\.\\d+)?)`);
  const match = block.match(re);
  return match ? parseFloat(match[1]) : null;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const getItemDefinitions = {
  name: 'shiva:getItemDefinitions',
  description: 'Get all registered inventory item definitions from installed modules',
  inputSchema: { type: 'object', properties: {}, required: [] },

  async handler(_, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules = scanModules(getResourcesDir(serverRoot));
    const items   = [];

    for (const mod of modules) {
      const luaFiles = collectLuaFiles(mod.path);
      for (const file of luaFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Pattern 1: Config.Items['key'] = { label = '...', weight = ..., type = '...' }
        const cfgItemRe = /Config\.Items\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*\{([^}]+)\}/g;
        let m;
        while ((m = cfgItemRe.exec(content)) !== null) {
          const [, name, body] = m;
          items.push({
            name,
            module:  mod.name,
            label:   extractField(body, 'label'),
            weight:  extractNumber(body, 'weight'),
            type:    extractField(body, 'type') || 'item',
            usable:  /usable\s*=\s*true/.test(body),
          });
        }

        // Pattern 2: items['key'] = { ... } (local table)
        const localItemRe = /\bitems\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*\{([^}]+)\}/g;
        while ((m = localItemRe.exec(content)) !== null) {
          const [, name, body] = m;
          if (items.find(i => i.name === name && i.module === mod.name)) continue;
          items.push({
            name,
            module:  mod.name,
            label:   extractField(body, 'label'),
            weight:  extractNumber(body, 'weight'),
            type:    extractField(body, 'type') || 'item',
            usable:  /usable\s*=\s*true/.test(body),
          });
        }

        // Pattern 3: Inventory.registerItem('key', { ... }) or Item.register(...)
        const registerRe = /(?:Inventory\.registerItem|Item\.register)\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}/g;
        while ((m = registerRe.exec(content)) !== null) {
          const [, name, body] = m;
          if (items.find(i => i.name === name && i.module === mod.name)) continue;
          items.push({
            name,
            module:  mod.name,
            label:   extractField(body, 'label'),
            weight:  extractNumber(body, 'weight'),
            type:    extractField(body, 'type') || 'item',
            usable:  /usable\s*=\s*true/.test(body),
          });
        }
      }
    }

    if (items.length === 0) return 'No item definitions found in installed modules.';
    return items;
  },
};

const getJobDefinitions = {
  name: 'shiva:getJobDefinitions',
  description: 'Get all registered job definitions from installed modules',
  inputSchema: { type: 'object', properties: {}, required: [] },

  async handler(_, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules = scanModules(getResourcesDir(serverRoot));
    const jobs    = [];

    for (const mod of modules) {
      const luaFiles = collectLuaFiles(mod.path);
      for (const file of luaFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Pattern 1: Config.Jobs['key'] = { label = '...', grades = {...} }
        const cfgJobRe = /Config\.Jobs\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=\s*\{([\s\S]*?)(?=\n\s*\}[\s\n]*(?:--|\[|Config|$))/g;
        let m;
        while ((m = cfgJobRe.exec(content)) !== null) {
          const [, name, body] = m;
          const grades = [];
          const gradeRe = /\[(\d+)\]\s*=\s*\{([^}]+)\}/g;
          let gm;
          while ((gm = gradeRe.exec(body)) !== null) {
            grades.push({
              grade:  parseInt(gm[1], 10),
              label:  extractField(gm[2], 'label'),
              salary: extractNumber(gm[2], 'salary'),
            });
          }
          jobs.push({ name, module: mod.name, label: extractField(body, 'label'), grades });
        }

        // Pattern 2: Job.register('key', { ... }) or Jobs.register(...)
        const registerRe = /(?:Job\.register|Jobs\.register)\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}/g;
        while ((m = registerRe.exec(content)) !== null) {
          const [, name, body] = m;
          if (jobs.find(j => j.name === name && j.module === mod.name)) continue;
          jobs.push({ name, module: mod.name, label: extractField(body, 'label'), grades: [] });
        }
      }
    }

    if (jobs.length === 0) return 'No job definitions found in installed modules.';
    return jobs;
  },
};

const getAvailableCommands = {
  name: 'shiva:getAvailableCommands',
  description: 'Get all registered commands from installed modules',
  inputSchema: { type: 'object', properties: {}, required: [] },

  async handler(_, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules  = scanModules(getResourcesDir(serverRoot));
    const commands = [];

    for (const mod of modules) {
      const luaFiles = collectLuaFiles(mod.path);
      for (const file of luaFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const side    = path.basename(file).startsWith('sv_') ? 'server'
                      : path.basename(file).startsWith('cl_') ? 'client'
                      : 'shared';

        // Pattern 1: Commands.register('name', { description, permission, params }, fn)
        const cmdRe = /Commands\.register\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]*)\}/g;
        let m;
        while ((m = cmdRe.exec(content)) !== null) {
          const [, name, body] = m;
          commands.push({
            name,
            module:      mod.name,
            side,
            description: extractField(body, 'description'),
            permission:  extractField(body, 'permission'),
          });
        }

        // Pattern 2: RegisterCommand('name', fn, restricted)
        const regCmdRe = /RegisterCommand\s*\(\s*['"]([^'"]+)['"]/g;
        while ((m = regCmdRe.exec(content)) !== null) {
          const [, name] = m;
          if (commands.find(c => c.name === name && c.module === mod.name)) continue;
          commands.push({ name, module: mod.name, side, description: null, permission: null });
        }
      }
    }

    if (commands.length === 0) return 'No commands found in installed modules.';
    return commands;
  },
};

const getServiceMethods = {
  name: 'shiva:getServiceMethods',
  description: 'Get all service methods from installed modules (including contract extensions)',
  inputSchema: {
    type: 'object',
    properties: {
      service: { type: 'string', description: 'Service/contract name to filter, e.g. Economy. Omit for all.' },
    },
    required: [],
  },

  async handler({ service } = {}, serverRoot) {
    if (!serverRoot) return 'Not in a Shiva project directory.';

    const modules  = scanModules(getResourcesDir(serverRoot));
    const services = {};

    for (const mod of modules) {
      const luaFiles = collectLuaFiles(path.join(mod.path, 'server')).concat(
        collectLuaFiles(path.join(mod.path, 'shared'))
      );

      for (const file of luaFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Pattern 1: Container.register('ServiceName', { method = function ... })
        const regRe = /Container\.register\s*\(\s*['"]([^'"]+)['"]/g;
        let m;
        while ((m = regRe.exec(content)) !== null) {
          const svcName = m[1];
          if (!services[svcName]) services[svcName] = { module: mod.name, methods: [] };
        }

        // Pattern 2: ServiceName.methodName = function(...) or function ServiceName.methodName(...)
        const methodRe = /(?:^|\n)\s*(?:function\s+(\w+)\.(\w+)\s*\(|(\w+)\.(\w+)\s*=\s*function\s*\()/g;
        while ((m = methodRe.exec(content)) !== null) {
          const svcName    = m[1] || m[3];
          const methodName = m[2] || m[4];
          if (!svcName || methodName === 'new') continue;
          if (service && svcName.toLowerCase() !== service.toLowerCase()) continue;
          if (!services[svcName]) services[svcName] = { module: mod.name, methods: [] };
          if (!services[svcName].methods.includes(methodName)) {
            services[svcName].methods.push(methodName);
          }
        }
      }
    }

    if (service) {
      const key = Object.keys(services).find(k => k.toLowerCase() === service.toLowerCase());
      return key ? { [key]: services[key] } : `Service not found: ${service}`;
    }

    if (Object.keys(services).length === 0) return 'No services found in installed modules.';
    return services;
  },
};

module.exports = [getItemDefinitions, getJobDefinitions, getAvailableCommands, getServiceMethods];
