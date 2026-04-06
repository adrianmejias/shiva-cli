'use strict';

const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');

const DEFAULT_REGISTRY = 'https://registry.shiva.dev';

/**
 * Get registry URL from config or default.
 * @param {object} config  shiva.json contents
 * @returns {string}
 */
function getRegistryUrl(config) {
  return (config && config.registry) || DEFAULT_REGISTRY;
}

/**
 * Perform a simple GET request returning parsed JSON.
 * @param {string} url
 * @returns {Promise<object>}
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'shiva-cli/1.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Registry returned ${res.statusCode} for ${url}`));
          return;
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON from registry: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch available versions for a module from the registry.
 * @param {string} registryUrl
 * @param {string} name
 * @returns {Promise<string[]>}
 */
async function fetchVersions(registryUrl, name) {
  const data = await fetchJson(`${registryUrl}/modules/${encodeURIComponent(name)}`);
  return data.versions || [];
}

/**
 * Fetch module metadata (including deps) for a specific version.
 * @param {string} registryUrl
 * @param {string} name
 * @param {string} version
 * @returns {Promise<object>}  { name, version, dependencies, downloadUrl, integrity }
 */
async function fetchModuleMeta(registryUrl, name, version) {
  return fetchJson(`${registryUrl}/modules/${encodeURIComponent(name)}/${encodeURIComponent(version)}`);
}

/**
 * Download a module tarball and extract it to destDir.
 * @param {string} downloadUrl
 * @param {string} destDir
 * @returns {Promise<void>}
 */
async function downloadModule(downloadUrl, destDir) {
  const { pipeline } = require('stream/promises');
  const zlib = require('zlib');

  return new Promise((resolve, reject) => {
    const mod = downloadUrl.startsWith('https') ? https : http;
    mod.get(downloadUrl, async (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }
      try {
        fs.mkdirSync(destDir, { recursive: true });
        try {
          const tar = require('tar');
          await pipeline(res, zlib.createGunzip(), tar.extract({ cwd: destDir, strip: 1 }));
        } catch {
          // Fallback: save raw bytes when tar is not available
          const outPath = path.join(destDir, '_downloaded.tar.gz');
          const out = fs.createWriteStream(outPath);
          await pipeline(res, out);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    }).on('error', reject);
  });
}

module.exports = { getRegistryUrl, fetchJson, fetchVersions, fetchModuleMeta, downloadModule };
