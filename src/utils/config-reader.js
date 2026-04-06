'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Read shiva.json from the given server root.
 * @param {string} serverRoot
 * @returns {object}
 */
function readShivaConfig(serverRoot) {
  const configPath = path.join(serverRoot, 'shiva.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`shiva.json not found at ${configPath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Failed to parse shiva.json: ${err.message}`);
  }
}

/**
 * Write shiva.json to the given server root.
 * @param {string} serverRoot
 * @param {object} config
 */
function writeShivaConfig(serverRoot, config) {
  const configPath = path.join(serverRoot, 'shiva.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Read shiva.lock from the given server root.
 * @param {string} serverRoot
 * @returns {object}
 */
function readLockfile(serverRoot) {
  const lockPath = path.join(serverRoot, 'shiva.lock');
  if (!fs.existsSync(lockPath)) {
    return { version: 1, modules: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  } catch {
    return { version: 1, modules: {} };
  }
}

/**
 * Write shiva.lock to the given server root.
 * @param {string} serverRoot
 * @param {object} lockData
 */
function writeLockfile(serverRoot, lockData) {
  const lockPath = path.join(serverRoot, 'shiva.lock');
  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + '\n', 'utf-8');
}

/**
 * Get database connection config from shiva.json.
 * @param {string} serverRoot
 * @returns {object|null}
 */
function getDatabaseConfig(serverRoot) {
  try {
    const config = readShivaConfig(serverRoot);
    return config.database || null;
  } catch {
    return null;
  }
}

module.exports = { readShivaConfig, writeShivaConfig, readLockfile, writeLockfile, getDatabaseConfig };
