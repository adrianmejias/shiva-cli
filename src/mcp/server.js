'use strict';

const { Server }               = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const path = require('path');
const fs   = require('fs');

const { findServerRoot, getResourcesDir } = require('../utils/server-root');
const { getDatabaseConfig } = require('../utils/config-reader');
const { scanModules } = require('../utils/lua-parser');

async function startMcpServer(options = {}) {
  const serverRoot = findServerRoot(process.cwd());

  const server = new Server(
    { name: 'shiva', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS.find(t => t.name === request.params.name);
    if (!tool) {
      return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }], isError: true };
    }
    try {
      const result = await tool.handler(request.params.arguments || {}, serverRoot);
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// ─── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'shiva:getInstalledModules',
    description: 'List all installed Shiva modules with version and dependency info',
    inputSchema: { type: 'object', properties: {}, required: [] },
    async handler(_, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const modules = scanModules(getResourcesDir(serverRoot));
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
  },
  {
    name: 'shiva:getModuleConfig',
    description: 'Get the configuration schema and values for a module',
    inputSchema: { type: 'object', properties: { module: { type: 'string', description: 'Module name, e.g. shiva-economy' } }, required: ['module'] },
    async handler({ module: moduleName }, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const modules = scanModules(getResourcesDir(serverRoot));
      const mod = modules.find(m => m.name === moduleName || m.name === `shiva-${moduleName}`);
      if (!mod) return `Module not found: ${moduleName}`;
      const configFile = path.join(mod.path, 'config', 'config.lua');
      if (!fs.existsSync(configFile)) return `No config file for ${moduleName}`;
      return fs.readFileSync(configFile, 'utf-8');
    },
  },
  {
    name: 'shiva:getRegisteredEvents',
    description: 'Get all events registered across installed modules',
    inputSchema: { type: 'object', properties: {}, required: [] },
    async handler(_, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const modules = scanModules(getResourcesDir(serverRoot));
      const events = [];
      for (const mod of modules) {
        for (const event of (mod.manifest.events || [])) {
          events.push({ module: mod.name, event });
        }
      }
      return events;
    },
  },
  {
    name: 'shiva:getContractMethods',
    description: 'Get methods defined in a contract file',
    inputSchema: { type: 'object', properties: { contract: { type: 'string', description: 'Contract name, e.g. Economy' } }, required: ['contract'] },
    async handler({ contract }, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const contractsDir = path.join(serverRoot, 'shared', 'contracts');
      if (!fs.existsSync(contractsDir)) return 'No contracts directory found.';
      const slug = contract.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const file = path.join(contractsDir, `sh_${slug}.lua`);
      if (!fs.existsSync(file)) return `Contract not found: sh_${slug}.lua`;
      return fs.readFileSync(file, 'utf-8');
    },
  },
  {
    name: 'shiva:getDatabaseSchema',
    description: 'Get all tables and columns from the database',
    inputSchema: { type: 'object', properties: {}, required: [] },
    async handler(_, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const dbConfig = getDatabaseConfig(serverRoot);
      if (!dbConfig) return 'No database configuration in shiva.json';
      const mysql = require('mysql2/promise');
      const conn  = await mysql.createConnection({
        host: dbConfig.host, port: dbConfig.port || 3306,
        user: dbConfig.user, password: dbConfig.password,
        database: dbConfig.database,
      });
      try {
        const [tables] = await conn.execute(
          `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
           FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
          [dbConfig.database]
        );
        const schema = {};
        for (const row of tables) {
          if (!schema[row.TABLE_NAME]) schema[row.TABLE_NAME] = [];
          schema[row.TABLE_NAME].push({ column: row.COLUMN_NAME, type: row.COLUMN_TYPE, nullable: row.IS_NULLABLE === 'YES', default: row.COLUMN_DEFAULT });
        }
        return schema;
      } finally {
        await conn.end();
      }
    },
  },
  {
    name: 'shiva:getMigrationStatus',
    description: 'Show which migrations have run and which are pending',
    inputSchema: { type: 'object', properties: {}, required: [] },
    async handler(_, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const dbConfig = getDatabaseConfig(serverRoot);
      if (!dbConfig) return 'No database configuration in shiva.json';
      const mysql = require('mysql2/promise');
      const conn  = await mysql.createConnection({
        host: dbConfig.host, port: dbConfig.port || 3306,
        user: dbConfig.user, password: dbConfig.password,
        database: dbConfig.database,
      });
      try {
        const [rows] = await conn.execute('SELECT migration, ran_at FROM shiva_migrations ORDER BY id').catch(() => [[]]);
        const modules = scanModules(getResourcesDir(serverRoot));
        const ran = new Set(rows.map(r => r.migration));
        const all = [];
        for (const mod of modules) {
          for (const mig of (mod.manifest.migrations || [])) {
            const id = `${mod.name}/${mig}`;
            all.push({ migration: id, status: ran.has(id) ? 'ran' : 'pending' });
          }
        }
        return all;
      } finally {
        await conn.end();
      }
    },
  },
  {
    name: 'shiva:searchDocs',
    description: 'Search across module AGENTS.md files for documentation',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
    async handler({ query }, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const modules = scanModules(getResourcesDir(serverRoot));
      const results = [];
      const q = query.toLowerCase();
      for (const mod of modules) {
        const agentsFile = path.join(mod.path, 'AGENTS.md');
        if (!fs.existsSync(agentsFile)) continue;
        const content = fs.readFileSync(agentsFile, 'utf-8');
        if (content.toLowerCase().includes(q)) {
          const lines = content.split('\n').filter(l => l.toLowerCase().includes(q));
          results.push({ module: mod.name, matches: lines.slice(0, 5) });
        }
      }
      return results.length > 0 ? results : `No results for "${query}"`;
    },
  },
];

module.exports = { startMcpServer };
