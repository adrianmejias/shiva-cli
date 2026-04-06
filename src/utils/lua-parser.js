'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Parse a module.lua manifest file.
 * Extracts name, version, dependencies etc. using simple regex patterns.
 * @param {string} filePath
 * @returns {object}
 */
function parseModuleManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  const result = {
    name: extractLuaString(content, 'name'),
    version: extractLuaString(content, 'version'),
    description: extractLuaString(content, 'description'),
    author: extractLuaString(content, 'author'),
    dependencies: extractLuaArray(content, 'dependencies'),
    events: extractLuaArray(content, 'events'),
  };

  return result;
}

/**
 * Parse an fxmanifest.lua file.
 * @param {string} filePath
 * @returns {object}
 */
function parseFxManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  return {
    fxVersion: extractManifestValue(content, 'fx_version'),
    game: extractManifestValue(content, 'game'),
    name: extractManifestValue(content, 'name') || extractManifestValue(content, 'resource'),
    version: extractManifestValue(content, 'version'),
    description: extractManifestValue(content, 'description'),
  };
}

function extractLuaString(content, key) {
  const re = new RegExp(`${key}\\s*=\\s*['"]([^'"]+)['"]`);
  const match = content.match(re);
  return match ? match[1] : null;
}

function extractManifestValue(content, key) {
  const re = new RegExp(`^${key}\\s+['"]([^'"]+)['"]`, 'm');
  const match = content.match(re);
  return match ? match[1] : null;
}

function extractLuaArray(content, key) {
  const re = new RegExp(`${key}\\s*=\\s*\\{([^}]*)\\}`, 's');
  const match = content.match(re);
  if (!match) return [];

  const items = match[1].match(/['"]([^'"]+)['"]/g);
  if (!items) return [];
  return items.map(s => s.replace(/['"]/g, ''));
}

/**
 * Scan a resources directory for Shiva modules.
 * Looks for module.lua files under resources/[shiva]/ directories.
 * @param {string} resourcesDir
 * @returns {Array<{name: string, path: string, manifest: object}>}
 */
function scanModules(resourcesDir) {
  if (!fs.existsSync(resourcesDir)) return [];

  const modules = [];
  const shivaDir = path.join(resourcesDir, '[shiva]');

  if (fs.existsSync(shivaDir)) {
    scanCategoryDir(shivaDir, modules);
  }

  // Also scan other [category] dirs for compatibility
  const entries = fs.readdirSync(resourcesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('[') && entry.name !== '[shiva]') {
      scanCategoryDir(path.join(resourcesDir, entry.name), modules);
    }
  }

  return modules;
}

function scanCategoryDir(categoryDir, modules) {
  if (!fs.existsSync(categoryDir)) return;
  const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const modulePath = path.join(categoryDir, entry.name);
    const manifestPath = path.join(modulePath, 'module.lua');
    const manifest = parseModuleManifest(manifestPath);
    if (manifest) {
      modules.push({
        name: manifest.name || entry.name,
        path: modulePath,
        manifest,
      });
    }
  }
}

module.exports = { parseModuleManifest, parseFxManifest, scanModules };
