'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Walk up directory tree looking for a Shiva server root.
 * Identifies root by presence of shiva.json or server.cfg.
 * @param {string} startDir
 * @returns {string|null}
 */
function findServerRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, 'shiva.json'))) {
      return dir;
    }
    if (fs.existsSync(path.join(dir, 'server.cfg'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

/**
 * Get the resources directory for the server root.
 * @param {string} serverRoot
 * @returns {string}
 */
function getResourcesDir(serverRoot) {
  return path.join(serverRoot, 'resources');
}

/**
 * Get the [shiva] category directory within resources.
 * Follows FiveM's [category] folder convention.
 * @param {string} serverRoot
 * @returns {string}
 */
function getShivaModulesDir(serverRoot) {
  return path.join(serverRoot, 'resources', '[shiva]');
}

/**
 * Require a server root or throw a helpful error.
 * @param {string} [startDir]
 * @returns {string}
 */
function requireServerRoot(startDir = process.cwd()) {
  const root = findServerRoot(startDir);
  if (!root) {
    const chalk = require('chalk');
    console.error(chalk.red('✖ Could not find a Shiva server root.'));
    console.error(chalk.yellow('  Run this command from within a Shiva project, or run `shiva init` first.'));
    process.exit(1);
  }
  return root;
}

module.exports = { findServerRoot, getResourcesDir, getShivaModulesDir, requireServerRoot };
