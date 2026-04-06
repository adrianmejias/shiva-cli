'use strict';

const fs   = require('fs');
const path = require('path');

const { findServerRoot } = require('../../utils/server-root');

const TEMPLATE_URI = 'shiva:contracts/{name}';

/**
 * Resolve the contracts directory — checks project-level then shiva-core submodule.
 * @param {string} serverRoot
 * @returns {string|null}
 */
function findContractsDir(serverRoot) {
  const candidates = [
    path.join(serverRoot, 'shared', 'contracts'),
    path.join(serverRoot, 'shared', 'sh_contracts'),
    path.join(serverRoot, 'resources', '[shiva]', 'shiva-core', 'shared', 'sh_contracts'),
  ];
  return candidates.find(d => fs.existsSync(d)) || null;
}

/**
 * List all available contracts.
 * @param {string} serverRoot
 * @returns {Array<{uri, name, description, mimeType}>}
 */
function listContracts(serverRoot) {
  const dir = findContractsDir(serverRoot);
  if (!dir) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.lua'))
    .map(f => {
      const slug = f.replace(/^sh_/, '').replace(/\.lua$/, '');
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      return {
        uri:         `shiva:contracts/${slug}`,
        name:        `${name} contract`,
        description: `Contract interface: ${name}`,
        mimeType:    'text/x-lua',
      };
    });
}

/**
 * Read a contract resource by URI.
 * @param {string} uri   e.g. "shiva:contracts/economy"
 * @param {string} serverRoot
 * @returns {{uri, mimeType, text}|null}
 */
function readContract(uri, serverRoot) {
  const slug = uri.replace(/^shiva:contracts\//, '');
  const dir  = findContractsDir(serverRoot);
  if (!dir) return null;

  const file = path.join(dir, `sh_${slug}.lua`);
  if (!fs.existsSync(file)) return null;

  return {
    uri,
    mimeType: 'text/x-lua',
    text:     fs.readFileSync(file, 'utf-8'),
  };
}

module.exports = { TEMPLATE_URI, listContracts, readContract };
