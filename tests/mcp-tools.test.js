'use strict';

const { parseAnnotations, toMarkdown, scanModuleAnnotations, collectLuaFiles } = require('../src/utils/lua-annotations');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal temp Shiva project with modules.
 * @param {Array<{name:string, manifest:object, files?:Record<string,string>}>} moduleDefs
 * @returns {{ serverRoot:string, cleanup:function }}
 */
function makeTempProject(moduleDefs = []) {
  const serverRoot   = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-proj-'));
  const resourcesDir = path.join(serverRoot, 'resources', '[shiva]');
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.writeFileSync(path.join(serverRoot, 'shiva.json'), JSON.stringify({ name: 'test-server', modules: {} }));

  for (const { name, manifest, files = {} } of moduleDefs) {
    const modDir = path.join(resourcesDir, name);
    fs.mkdirSync(modDir, { recursive: true });

    // Write module.lua with proper Lua syntax
    const toLua = (v) => {
      if (Array.isArray(v)) return `{ ${v.map(s => `'${s}'`).join(', ')} }`;
      return JSON.stringify(v);
    };
    const fields = Object.entries(manifest)
      .map(([k, v]) => `    ${k} = ${toLua(v)},`)
      .join('\n');
    fs.writeFileSync(path.join(modDir, 'module.lua'), `return {\n${fields}\n}\n`);

    // Write any extra files
    for (const [relPath, content] of Object.entries(files)) {
      const full = path.join(modDir, relPath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
  }

  return { serverRoot, cleanup: () => fs.rmSync(serverRoot, { recursive: true, force: true }) };
}

// ─── shiva:getInstalledModules ────────────────────────────────────────────────

describe('shiva:getInstalledModules', () => {
  const tool = require('../src/mcp/tools/modules');

  test('returns message when serverRoot is null', async () => {
    const result = await tool.handler({}, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('returns message when no modules found', async () => {
    const { serverRoot, cleanup } = makeTempProject([]);
    try {
      const result = await tool.handler({}, serverRoot);
      expect(typeof result).toBe('string');
      expect(result).toContain('No Shiva modules');
    } finally {
      cleanup();
    }
  });

  test('lists installed modules with manifest fields', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      { name: 'shiva-economy', manifest: { name: 'shiva-economy', version: '1.0.0', description: 'Economy module' } },
    ]);
    try {
      const result = await tool.handler({}, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe('shiva-economy');
      expect(result[0].version).toBe('1.0.0');
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getRegisteredEvents ────────────────────────────────────────────────

describe('shiva:getRegisteredEvents', () => {
  const tool = require('../src/mcp/tools/events');

  test('returns message when serverRoot is null', async () => {
    const result = await tool.handler({}, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('returns message when no events declared', async () => {
    const { serverRoot, cleanup } = makeTempProject([]);
    try {
      const result = await tool.handler({}, serverRoot);
      expect(typeof result).toBe('string');
    } finally {
      cleanup();
    }
  });

  test('collects events from module manifests', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-economy',
        manifest: { name: 'shiva-economy', version: '1.0.0', events: ['economy:balanceChanged', 'economy:transfer'] },
      },
    ]);
    try {
      const result = await tool.handler({}, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ module: 'shiva-economy', event: 'economy:balanceChanged' });
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getModuleConfig ────────────────────────────────────────────────────

describe('shiva:getModuleConfig', () => {
  const tool = require('../src/mcp/tools/config');

  test('returns message when serverRoot is null', async () => {
    const result = await tool.handler({ module: 'economy' }, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('returns not-found message for unknown module', async () => {
    const { serverRoot, cleanup } = makeTempProject([]);
    try {
      const result = await tool.handler({ module: 'nonexistent' }, serverRoot);
      expect(result).toContain('not found');
    } finally {
      cleanup();
    }
  });

  test('returns config content when file exists', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-economy',
        manifest: { name: 'shiva-economy', version: '1.0.0' },
        files: { 'config/config.lua': `Config = { startingBalance = 500 }` },
      },
    ]);
    try {
      const result = await tool.handler({ module: 'shiva-economy' }, serverRoot);
      expect(result.config).toContain('startingBalance');
    } finally {
      cleanup();
    }
  });

  test('resolves short module name (without shiva- prefix)', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-economy',
        manifest: { name: 'shiva-economy', version: '1.0.0' },
        files: { 'config/config.lua': `Config = {}` },
      },
    ]);
    try {
      const result = await tool.handler({ module: 'economy' }, serverRoot);
      expect(result.config).toBeDefined();
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getContractMethods ─────────────────────────────────────────────────

describe('shiva:getContractMethods', () => {
  const tool = require('../src/mcp/tools/contracts');

  test('returns message when serverRoot is null', async () => {
    const result = await tool.handler({ contract: 'Economy' }, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('reads contract file from shared/contracts/', async () => {
    const serverRoot   = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-contract-'));
    const contractsDir = path.join(serverRoot, 'shared', 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    fs.writeFileSync(path.join(contractsDir, 'sh_economy.lua'), `return { name = 'Economy', server = { 'getBalance' } }`);
    try {
      const result = await tool.handler({ contract: 'Economy' }, serverRoot);
      expect(result.content).toContain('getBalance');
    } finally {
      fs.rmSync(serverRoot, { recursive: true, force: true });
    }
  });

  test('returns not-found message for missing contract', async () => {
    const serverRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-nc-'));
    try {
      const result = await tool.handler({ contract: 'NonExistent' }, serverRoot);
      expect(result).toContain('not found');
    } finally {
      fs.rmSync(serverRoot, { recursive: true, force: true });
    }
  });
});

// ─── shiva:searchDocs ─────────────────────────────────────────────────────────

describe('shiva:searchDocs', () => {
  const tool = require('../src/mcp/tools/docs');

  test('returns message when serverRoot is null', async () => {
    const result = await tool.handler({ query: 'anything' }, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('returns no-results message when nothing matches', async () => {
    const { serverRoot, cleanup } = makeTempProject([]);
    try {
      const result = await tool.handler({ query: 'xyzzy_no_match' }, serverRoot);
      expect(result).toContain('No documentation matches');
    } finally {
      cleanup();
    }
  });

  test('finds matches in module AGENTS.md', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-economy',
        manifest: { name: 'shiva-economy', version: '1.0.0' },
        files: { 'AGENTS.md': '# Economy\nHandles cash transfers and bank accounts.' },
      },
    ]);
    try {
      const result = await tool.handler({ query: 'transfers' }, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].module).toBe('shiva-economy');
      expect(result[0].matches[0]).toContain('transfers');
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getItemDefinitions ─────────────────────────────────────────────────

describe('shiva:getItemDefinitions', () => {
  const tools    = require('../src/mcp/tools/items');
  const itemTool = tools.find(t => t.name === 'shiva:getItemDefinitions');

  test('returns message when serverRoot is null', async () => {
    const result = await itemTool.handler({}, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('returns message when no items found', async () => {
    const { serverRoot, cleanup } = makeTempProject([]);
    try {
      const result = await itemTool.handler({}, serverRoot);
      expect(typeof result).toBe('string');
    } finally {
      cleanup();
    }
  });

  test('parses Config.Items table pattern', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-inventory',
        manifest: { name: 'shiva-inventory', version: '1.0.0' },
        files: {
          'config/config.lua': [
            `Config.Items['bread'] = { label = 'Bread', weight = 200, type = 'item', usable = true }`,
            `Config.Items['water'] = { label = 'Water', weight = 150, type = 'item' }`,
          ].join('\n'),
        },
      },
    ]);
    try {
      const result = await itemTool.handler({}, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      const bread = result.find(i => i.name === 'bread');
      expect(bread).toBeDefined();
      expect(bread.label).toBe('Bread');
      expect(bread.weight).toBe(200);
      expect(bread.usable).toBe(true);
    } finally {
      cleanup();
    }
  });

  test('parses Inventory.registerItem() pattern', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-inventory',
        manifest: { name: 'shiva-inventory', version: '1.0.0' },
        files: {
          'server/sv_items.lua': `Inventory.registerItem('lockpick', { label = 'Lockpick', weight = 50, type = 'item' })`,
        },
      },
    ]);
    try {
      const result = await itemTool.handler({}, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      expect(result.find(i => i.name === 'lockpick')).toBeDefined();
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getAvailableCommands ───────────────────────────────────────────────

describe('shiva:getAvailableCommands', () => {
  const tools   = require('../src/mcp/tools/items');
  const cmdTool = tools.find(t => t.name === 'shiva:getAvailableCommands');

  test('returns message when serverRoot is null', async () => {
    const result = await cmdTool.handler({}, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('parses Commands.register() pattern', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-police',
        manifest: { name: 'shiva-police', version: '1.0.0' },
        files: {
          'server/sv_commands.lua': `Commands.register('fine', { description = 'Issue a fine', permission = 'police' }, function() end)`,
        },
      },
    ]);
    try {
      const result = await cmdTool.handler({}, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      const fine = result.find(c => c.name === 'fine');
      expect(fine).toBeDefined();
      expect(fine.description).toBe('Issue a fine');
      expect(fine.permission).toBe('police');
    } finally {
      cleanup();
    }
  });

  test('parses RegisterCommand() FiveM native', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-admin',
        manifest: { name: 'shiva-admin', version: '1.0.0' },
        files: {
          'server/sv_admin.lua': `RegisterCommand('kick', function(source, args) end, true)`,
        },
      },
    ]);
    try {
      const result = await cmdTool.handler({}, serverRoot);
      expect(Array.isArray(result)).toBe(true);
      expect(result.find(c => c.name === 'kick')).toBeDefined();
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getServiceMethods ──────────────────────────────────────────────────

describe('shiva:getServiceMethods', () => {
  const tools   = require('../src/mcp/tools/items');
  const svcTool = tools.find(t => t.name === 'shiva:getServiceMethods');

  test('returns message when serverRoot is null', async () => {
    const result = await svcTool.handler({}, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('parses function ServiceName.method() definitions', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-economy',
        manifest: { name: 'shiva-economy', version: '1.0.0' },
        files: {
          'server/sv_economy.lua': [
            `function EconomyService.getBalance(source) end`,
            `function EconomyService.addMoney(source, amount) end`,
          ].join('\n'),
        },
      },
    ]);
    try {
      const result = await svcTool.handler({}, serverRoot);
      expect(typeof result).toBe('object');
      expect(result['EconomyService']).toBeDefined();
      expect(result['EconomyService'].methods).toContain('getBalance');
      expect(result['EconomyService'].methods).toContain('addMoney');
    } finally {
      cleanup();
    }
  });

  test('filters by service name when provided', async () => {
    const { serverRoot, cleanup } = makeTempProject([
      {
        name: 'shiva-economy',
        manifest: { name: 'shiva-economy', version: '1.0.0' },
        files: {
          'server/sv.lua': [
            `function EconomyService.getBalance(s) end`,
            `function OtherService.doThing(s) end`,
          ].join('\n'),
        },
      },
    ]);
    try {
      const result = await svcTool.handler({ service: 'EconomyService' }, serverRoot);
      expect(result['EconomyService']).toBeDefined();
      expect(result['OtherService']).toBeUndefined();
    } finally {
      cleanup();
    }
  });
});

// ─── shiva:getDatabaseSchema (no live DB needed) ──────────────────────────────

describe('shiva:getDatabaseSchema', () => {
  const tools  = require('../src/mcp/tools/database');
  const dbTool = tools.find(t => t.name === 'shiva:getDatabaseSchema');

  test('returns message when serverRoot is null', async () => {
    const result = await dbTool.handler({}, null);
    expect(result).toContain('Not in a Shiva project directory');
  });

  test('returns message when no database config in shiva.json', async () => {
    const serverRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-db-'));
    fs.writeFileSync(path.join(serverRoot, 'shiva.json'), JSON.stringify({ name: 'test' }));
    try {
      const result = await dbTool.handler({}, serverRoot);
      expect(result).toContain('No database configuration');
    } finally {
      fs.rmSync(serverRoot, { recursive: true, force: true });
    }
  });
});
