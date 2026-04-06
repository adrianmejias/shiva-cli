'use strict';

/**
 * LuaLS annotation parser for shiva-cli.
 *
 * Parses the following LuaLS annotation tags from Lua source files:
 *   ---@class  ClassName [: ParentClass]
 *   ---@field  name type [description]
 *   ---@param  name type [description]
 *   ---@return type [name] [description]
 *   ---@alias  name type
 *   ---@type   type
 *
 * Usage:
 *   const { parseAnnotations, scanModuleAnnotations } = require('./lua-annotations');
 *   const api = scanModuleAnnotations('/path/to/module');
 */

const fs   = require('fs');
const path = require('path');

// ─── Regex patterns ────────────────────────────────────────────────────────────

const RE_CLASS  = /^---@class\s+(\w+)(?:\s*:\s*(\w+))?\s*(?:--\s*(.*))?$/;
const RE_FIELD  = /^---@field\s+(\w+)\s+(\S+)(?:\s+(.*))?$/;
const RE_PARAM  = /^---@param\s+(\w+)\s+(\S+)(?:\s+(.*))?$/;
const RE_RETURN = /^---@return\s+(\S+)(?:\s+(\w+))?(?:\s+(.*))?$/;
const RE_ALIAS  = /^---@alias\s+(\w+)\s+(\S+)(?:\s+(.*))?$/;
const RE_TYPE   = /^---@type\s+(\S+)(?:\s+(.*))?$/;
const RE_FN_DEF = /^(?:local\s+)?function\s+([\w.]+)\s*\(([^)]*)\)/;
const RE_FN_ASSIGN = /^(?:local\s+)?([\w.]+)\s*=\s*function\s*\(([^)]*)\)/;
const RE_COMMENT = /^---\s*(.*)/;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LuaParam
 * @property {string} name
 * @property {string} type
 * @property {string|null} description
 */

/**
 * @typedef {Object} LuaReturn
 * @property {string} type
 * @property {string|null} name
 * @property {string|null} description
 */

/**
 * @typedef {Object} LuaFunction
 * @property {string} name
 * @property {string|null} description
 * @property {LuaParam[]} params
 * @property {LuaReturn[]} returns
 * @property {string} file
 * @property {number} line
 */

/**
 * @typedef {Object} LuaClass
 * @property {string} name
 * @property {string|null} parent
 * @property {string|null} description
 * @property {Array<{name:string,type:string,description:string|null}>} fields
 * @property {string} file
 * @property {number} line
 */

/**
 * @typedef {Object} LuaAlias
 * @property {string} name
 * @property {string} type
 * @property {string|null} description
 */

/**
 * @typedef {Object} ParseResult
 * @property {LuaClass[]}    classes
 * @property {LuaFunction[]} functions
 * @property {LuaAlias[]}    aliases
 */

// ─── Core parser ──────────────────────────────────────────────────────────────

/**
 * Parse LuaLS annotations from a single Lua source string.
 * @param {string} source      Lua source code
 * @param {string} [filePath]  Path for source attribution
 * @returns {ParseResult}
 */
function parseAnnotations(source, filePath = '<unknown>') {
  const lines     = source.split('\n');
  const classes   = [];
  const functions = [];
  const aliases   = [];

  let pendingParams  = /** @type {LuaParam[]} */ ([]);
  let pendingReturns = /** @type {LuaReturn[]} */ ([]);
  let pendingDesc    = /** @type {string[]} */    ([]);
  let currentClass   = /** @type {LuaClass|null} */ (null);

  const flushPending = () => {
    pendingParams  = [];
    pendingReturns = [];
    pendingDesc    = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // ── @class ────────────────────────────────────────────────
    const classMatch = line.match(RE_CLASS);
    if (classMatch) {
      const [, name, parent, desc] = classMatch;
      currentClass = { name, parent: parent || null, description: desc || null, fields: [], file: filePath, line: i + 1 };
      classes.push(currentClass);
      flushPending();
      continue;
    }

    // ── @field (attached to the last @class) ─────────────────
    const fieldMatch = line.match(RE_FIELD);
    if (fieldMatch && currentClass) {
      const [, name, type, desc] = fieldMatch;
      currentClass.fields.push({ name, type, description: desc || null });
      continue;
    }

    // ── @alias ────────────────────────────────────────────────
    const aliasMatch = line.match(RE_ALIAS);
    if (aliasMatch) {
      const [, name, type, desc] = aliasMatch;
      aliases.push({ name, type, description: desc || null });
      flushPending();
      continue;
    }

    // ── @param ────────────────────────────────────────────────
    const paramMatch = line.match(RE_PARAM);
    if (paramMatch) {
      const [, name, type, desc] = paramMatch;
      pendingParams.push({ name, type, description: desc || null });
      currentClass = null;
      continue;
    }

    // ── @return ───────────────────────────────────────────────
    const returnMatch = line.match(RE_RETURN);
    if (returnMatch) {
      const [, type, name, desc] = returnMatch;
      pendingReturns.push({ type, name: name || null, description: desc || null });
      currentClass = null;
      continue;
    }

    // ── Free-standing doc comment ─────────────────────────────
    const commentMatch = line.match(RE_COMMENT);
    if (commentMatch && !line.startsWith('---@')) {
      pendingDesc.push(commentMatch[1].trim());
      continue;
    }

    // ── Function definitions ──────────────────────────────────
    const fnDef    = line.match(RE_FN_DEF);
    const fnAssign = line.match(RE_FN_ASSIGN);
    const fnMatch  = fnDef || fnAssign;

    if (fnMatch) {
      const name    = fnMatch[1];
      const rawArgs = fnMatch[2] || '';
      const args    = rawArgs.split(',').map(s => s.trim()).filter(Boolean);
      const desc    = pendingDesc.length > 0 ? pendingDesc.join(' ') : null;

      // Merge @param annotations; fill in un-annotated args as unknown
      const params = args.map(argName => {
        const annotated = pendingParams.find(p => p.name === argName);
        return annotated || { name: argName, type: 'any', description: null };
      });

      // Add any extra @params not matched to positional args (e.g. varargs)
      for (const p of pendingParams) {
        if (!params.find(ep => ep.name === p.name)) {
          params.push(p);
        }
      }

      functions.push({
        name,
        description: desc,
        params,
        returns: [...pendingReturns],
        file:    filePath,
        line:    i + 1,
      });

      flushPending();
      currentClass = null;
      continue;
    }

    // ── Non-annotation, non-function line: reset if not blank ─
    if (line !== '' && !line.startsWith('---')) {
      flushPending();
      if (!line.startsWith('--')) currentClass = null;
    }
  }

  return { classes, functions, aliases };
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

/**
 * Recursively collect all .lua files in a directory.
 * @param {string} dir
 * @param {string[]} [results]
 * @returns {string[]}
 */
function collectLuaFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectLuaFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.lua')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Scan all Lua files in a module directory and return combined annotations.
 * @param {string} modulePath  Root path of a Shiva module
 * @returns {ParseResult}
 */
function scanModuleAnnotations(modulePath) {
  const luaFiles = collectLuaFiles(modulePath);
  const combined = /** @type {ParseResult} */ ({ classes: [], functions: [], aliases: [] });

  for (const file of luaFiles) {
    const source = fs.readFileSync(file, 'utf-8');
    const result = parseAnnotations(source, file);
    combined.classes.push(...result.classes);
    combined.functions.push(...result.functions);
    combined.aliases.push(...result.aliases);
  }

  return combined;
}

/**
 * Generate a Markdown API reference from parsed annotations.
 * @param {string} moduleName
 * @param {ParseResult} api
 * @returns {string}
 */
function toMarkdown(moduleName, api) {
  const lines = [`# ${moduleName} API Reference\n`];

  if (api.classes.length > 0) {
    lines.push('## Classes\n');
    for (const cls of api.classes) {
      const heading = cls.parent ? `### \`${cls.name}\` *(extends ${cls.parent})*` : `### \`${cls.name}\``;
      lines.push(heading);
      if (cls.description) lines.push(`\n${cls.description}\n`);
      if (cls.fields.length > 0) {
        lines.push('\n**Fields:**\n');
        lines.push('| Name | Type | Description |');
        lines.push('|------|------|-------------|');
        for (const f of cls.fields) {
          lines.push(`| \`${f.name}\` | \`${f.type}\` | ${f.description || ''} |`);
        }
      }
      lines.push('');
    }
  }

  if (api.aliases.length > 0) {
    lines.push('## Aliases\n');
    for (const a of api.aliases) {
      lines.push(`- **\`${a.name}\`** = \`${a.type}\`${a.description ? ' — ' + a.description : ''}`);
    }
    lines.push('');
  }

  if (api.functions.length > 0) {
    lines.push('## Functions\n');
    for (const fn of api.functions) {
      const paramStr = fn.params.map(p => p.name).join(', ');
      lines.push(`### \`${fn.name}(${paramStr})\``);
      if (fn.description) lines.push(`\n${fn.description}\n`);

      if (fn.params.length > 0) {
        lines.push('\n**Parameters:**\n');
        lines.push('| Name | Type | Description |');
        lines.push('|------|------|-------------|');
        for (const p of fn.params) {
          lines.push(`| \`${p.name}\` | \`${p.type}\` | ${p.description || ''} |`);
        }
      }

      if (fn.returns.length > 0) {
        lines.push('\n**Returns:**\n');
        for (const r of fn.returns) {
          const label = r.name ? `\`${r.name}\`` : '';
          const desc  = r.description || '';
          lines.push(`- \`${r.type}\`${label ? ' ' + label : ''}${desc ? ' — ' + desc : ''}`);
        }
      }

      lines.push(`\n*Defined in: \`${path.basename(fn.file)}\` line ${fn.line}*\n`);
    }
  }

  return lines.join('\n');
}

module.exports = { parseAnnotations, scanModuleAnnotations, collectLuaFiles, toMarkdown };
