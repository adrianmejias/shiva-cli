'use strict';

const path = require('path');
const fs   = require('fs');

const LOCKFILE_NAME = 'shiva.lock';

/**
 * Read the lockfile from server root.
 * @param {string} serverRoot
 * @returns {object}
 */
function readLockfile(serverRoot) {
  const p = path.join(serverRoot, LOCKFILE_NAME);
  if (!fs.existsSync(p)) return { version: 1, modules: {} };
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return { version: 1, modules: {} }; }
}

/**
 * Write the lockfile.
 * @param {string} serverRoot
 * @param {object} data
 */
function writeLockfile(serverRoot, data) {
  const p = path.join(serverRoot, LOCKFILE_NAME);
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Update a single module entry in the lockfile.
 * @param {string} serverRoot
 * @param {string} name
 * @param {object} entry  { version, resolved, integrity? }
 */
function lockModule(serverRoot, name, entry) {
  const lock = readLockfile(serverRoot);
  lock.modules[name] = { ...entry, lockedAt: new Date().toISOString() };
  writeLockfile(serverRoot, lock);
}

/**
 * Remove a module from the lockfile.
 * @param {string} serverRoot
 * @param {string} name
 */
function unlockModule(serverRoot, name) {
  const lock = readLockfile(serverRoot);
  delete lock.modules[name];
  writeLockfile(serverRoot, lock);
}

module.exports = { readLockfile, writeLockfile, lockModule, unlockModule };
