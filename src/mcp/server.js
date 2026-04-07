'use strict';

const { Server }               = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { findServerRoot } = require('../utils/server-root');

// ─── Load tools ───────────────────────────────────────────────────────────────

const contractsTool = require('./tools/contracts');
const modulesTool   = require('./tools/modules');
const databaseTools = require('./tools/database');   // array
const configTool    = require('./tools/config');
const eventsTool    = require('./tools/events');
const docsTool      = require('./tools/docs');
const itemsTools    = require('./tools/items');       // array

const TOOLS = [
  contractsTool,
  modulesTool,
  ...databaseTools,
  configTool,
  eventsTool,
  docsTool,
  ...itemsTools,
];

// ─── Load resources ───────────────────────────────────────────────────────────

const docsResource      = require('./resources/docs');
const contractsResource = require('./resources/contracts');
const examplesResource  = require('./resources/examples');

const RESOURCE_TEMPLATES = [
  { uriTemplate: docsResource.TEMPLATE_URI,      name: 'Module docs',     description: 'AGENTS.md content for an installed module',   mimeType: 'text/markdown' },
  { uriTemplate: contractsResource.TEMPLATE_URI, name: 'Contract',        description: 'Shiva contract interface definition',          mimeType: 'text/x-lua'   },
  { uriTemplate: examplesResource.TEMPLATE_URI,  name: 'Code example',    description: 'Example Lua code for common Shiva patterns',   mimeType: 'text/x-lua'   },
];

// ─── Server factory ───────────────────────────────────────────────────────────

async function startMcpServer() {
  const serverRoot = findServerRoot(process.cwd());

  const server = new Server(
    { name: 'shiva', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  // ── Tools ──────────────────────────────────────────────────────────────────

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
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  });

  // ── Resources ──────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: RESOURCE_TEMPLATES,
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    if (!serverRoot) return { resources: [] };
    const resources = [
      ...docsResource.listDocs(serverRoot),
      ...contractsResource.listContracts(serverRoot),
      ...examplesResource.listExamples(serverRoot),
    ];
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (!serverRoot) {
      return { contents: [{ uri, mimeType: 'text/plain', text: 'Not in a Shiva project directory.' }] };
    }

    let resource = null;

    if (uri.startsWith('shiva:docs/')) {
      resource = docsResource.readDoc(uri, serverRoot);
    } else if (uri.startsWith('shiva:contracts/')) {
      resource = contractsResource.readContract(uri, serverRoot);
    } else if (uri.startsWith('shiva:examples/')) {
      resource = examplesResource.readExample(uri, serverRoot);
    }

    if (!resource) {
      return { contents: [{ uri, mimeType: 'text/plain', text: `Resource not found: ${uri}` }] };
    }

    return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.text }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

module.exports = { startMcpServer };
