'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Render a template file, replacing {{KEY}} placeholders.
 * @param {string} templateRelPath  Path relative to src/generators/templates/
 * @param {object} vars             Key/value pairs for substitution
 * @returns {string}
 */
function renderTemplate(templateRelPath, vars = {}) {
  const fullPath = path.join(TEMPLATES_DIR, templateRelPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template not found: ${fullPath}`);
  }
  let content = fs.readFileSync(fullPath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.split(`{{${key}}}`).join(String(value));
  }
  return content;
}

/**
 * Write a rendered template to a destination file.
 * Creates parent directories automatically.
 * @param {string} templateRelPath
 * @param {string} destPath
 * @param {object} vars
 */
function writeTemplate(templateRelPath, destPath, vars = {}) {
  const content = renderTemplate(templateRelPath, vars);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf-8');
}

/**
 * Convert a name to PascalCase.
 * e.g. "fishing-rod" → "FishingRod", "fishing_rod" → "FishingRod"
 * @param {string} name
 * @returns {string}
 */
function toPascalCase(name) {
  return name
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase());
}

/**
 * Convert a name to snake_case.
 * e.g. "FishingRod" → "fishing_rod"
 * @param {string} name
 * @returns {string}
 */
function toSnakeCase(name) {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^[-_]/, '')
    .replace(/[-]/g, '_');
}

/**
 * Normalize a module name, ensuring "shiva-" prefix.
 * @param {string} name
 * @returns {string}
 */
function normalizeModuleName(name) {
  name = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!name.startsWith('shiva-')) {
    name = 'shiva-' + name;
  }
  return name;
}

module.exports = { renderTemplate, writeTemplate, toPascalCase, toSnakeCase, normalizeModuleName };
