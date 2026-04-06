'use strict';

const semver = require('semver');

/**
 * Check if a version satisfies a constraint.
 * @param {string} version
 * @param {string} constraint  e.g. "^1.0.0", "~1.2.0", ">=1.0.0 <2.0.0"
 * @returns {boolean}
 */
function satisfies(version, constraint) {
  if (!constraint || constraint === '*' || constraint === 'latest') return true;
  if (constraint.startsWith('file:')) return true;
  try {
    return semver.satisfies(version, constraint);
  } catch {
    return false;
  }
}

/**
 * Find the best matching version from a list given a constraint.
 * @param {string[]} versions   Sorted list of available versions
 * @param {string}  constraint
 * @returns {string|null}
 */
function resolveVersion(versions, constraint) {
  if (!constraint || constraint === 'latest') {
    return versions[versions.length - 1] || null;
  }
  if (constraint.startsWith('file:')) return constraint;

  const valid = versions
    .filter(v => semver.valid(v) && semver.satisfies(v, constraint))
    .sort(semver.compare);

  return valid[valid.length - 1] || null;
}

/**
 * Build a flat install plan by resolving transitive dependencies.
 * @param {object} directDeps   { name: constraint }
 * @param {Function} fetchVersions  async (name) => string[]
 * @param {Function} fetchDeps      async (name, version) => { name: constraint }
 * @returns {Promise<Map<string, string>>}  name → resolved version
 */
async function buildInstallPlan(directDeps, fetchVersions, fetchDeps) {
  const plan    = new Map();
  const queue   = Object.entries(directDeps);
  const visited = new Set();

  while (queue.length > 0) {
    const [name, constraint] = queue.shift();

    if (visited.has(name)) continue;
    visited.add(name);

    if (constraint.startsWith('file:')) {
      plan.set(name, constraint);
      continue;
    }

    const versions = await fetchVersions(name);
    const resolved = resolveVersion(versions, constraint);

    if (!resolved) {
      throw new Error(`Cannot resolve ${name}@${constraint} — no matching version found.`);
    }

    plan.set(name, resolved);

    const transitive = await fetchDeps(name, resolved);
    for (const [depName, depConstraint] of Object.entries(transitive || {})) {
      if (!visited.has(depName)) {
        queue.push([depName, depConstraint]);
      }
    }
  }

  return plan;
}

module.exports = { satisfies, resolveVersion, buildInstallPlan };
