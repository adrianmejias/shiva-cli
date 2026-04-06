'use strict';

const fs   = require('fs');
const path = require('path');

const { scanModules }     = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

const TEMPLATE_URI = 'shiva:docs/{topic}';

/**
 * List all available doc topics (module AGENTS.md files).
 * @param {string} serverRoot
 * @returns {Array<{uri, name, description, mimeType}>}
 */
function listDocs(serverRoot) {
  const modules   = scanModules(getResourcesDir(serverRoot));
  const resources = [];

  for (const mod of modules) {
    const agentsFile = path.join(mod.path, 'AGENTS.md');
    if (!fs.existsSync(agentsFile)) continue;
    resources.push({
      uri:         `shiva:docs/${mod.name}`,
      name:        `${mod.name} documentation`,
      description: mod.manifest.description || `AGENTS.md for ${mod.name}`,
      mimeType:    'text/markdown',
    });
  }

  return resources;
}

/**
 * Read a doc resource by URI.
 * @param {string} uri   e.g. "shiva:docs/shiva-economy"
 * @param {string} serverRoot
 * @returns {{uri, mimeType, text}|null}
 */
function readDoc(uri, serverRoot) {
  const topic   = uri.replace(/^shiva:docs\//, '');
  const modules = scanModules(getResourcesDir(serverRoot));
  const mod     = modules.find(m => m.name === topic);
  if (!mod) return null;

  const agentsFile = path.join(mod.path, 'AGENTS.md');
  if (!fs.existsSync(agentsFile)) return null;

  return {
    uri,
    mimeType: 'text/markdown',
    text:     fs.readFileSync(agentsFile, 'utf-8'),
  };
}

module.exports = { TEMPLATE_URI, listDocs, readDoc };
