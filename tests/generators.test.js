'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { renderTemplate, writeTemplate, toPascalCase, toSnakeCase, normalizeModuleName } = require('../src/generators/index');

// ─── toPascalCase ─────────────────────────────────────────────────────────────

describe('toPascalCase', () => {
  test('converts kebab-case', () => expect(toPascalCase('fishing-rod')).toBe('FishingRod'));
  test('converts snake_case',  () => expect(toPascalCase('fishing_rod')).toBe('FishingRod'));
  test('leaves PascalCase',    () => expect(toPascalCase('FishingRod')).toBe('FishingRod'));
  test('single word',          () => expect(toPascalCase('fishing')).toBe('Fishing'));
  test('multiple separators',  () => expect(toPascalCase('my-cool_module')).toBe('MyCoolModule'));
});

// ─── toSnakeCase ──────────────────────────────────────────────────────────────

describe('toSnakeCase', () => {
  test('converts PascalCase',  () => expect(toSnakeCase('FishingRod')).toBe('fishing_rod'));
  test('converts camelCase',   () => expect(toSnakeCase('fishingRod')).toBe('fishing_rod'));
  test('keeps snake_case',     () => expect(toSnakeCase('fishing_rod')).toBe('fishing_rod'));
  test('converts kebab-case',  () => expect(toSnakeCase('fishing-rod')).toBe('fishing_rod'));
  test('leading uppercase',    () => expect(toSnakeCase('Economy')).toBe('economy'));
});

// ─── normalizeModuleName ──────────────────────────────────────────────────────

describe('normalizeModuleName', () => {
  test('adds shiva- prefix',          () => expect(normalizeModuleName('fishing')).toBe('shiva-fishing'));
  test('keeps existing shiva- prefix',() => expect(normalizeModuleName('shiva-fishing')).toBe('shiva-fishing'));
  test('lowercases name',             () => expect(normalizeModuleName('Fishing')).toBe('shiva-fishing'));
  test('replaces underscores',        () => expect(normalizeModuleName('my_module')).toBe('shiva-my-module'));
  test('trims leading/trailing dashes', () => expect(normalizeModuleName('-fishing-')).toBe('shiva-fishing'));
  test('collapses repeated dashes',   () => expect(normalizeModuleName('my--module')).toBe('shiva-my-module'));
});

// ─── renderTemplate ───────────────────────────────────────────────────────────

describe('renderTemplate', () => {
  test('renders a known template with vars', () => {
    const out = renderTemplate('service.lua.tpl', { ServiceName: 'FishingService' });
    expect(out).toContain('FishingService');
    expect(out).not.toContain('{{ServiceName}}');
  });

  test('leaves unreplaced placeholders when no var given', () => {
    const out = renderTemplate('service.lua.tpl', {});
    expect(out).toContain('{{ServiceName}}');
  });

  test('throws on missing template file', () => {
    expect(() => renderTemplate('does_not_exist.tpl')).toThrow();
  });

  test('replaces multiple occurrences of the same placeholder', () => {
    const out = renderTemplate('model.lua.tpl', { ModelName: 'Fish', table_name: 'fish' });
    const count = (out.match(/Fish/g) || []).length;
    expect(count).toBeGreaterThan(1);
  });
});

// ─── writeTemplate ────────────────────────────────────────────────────────────

describe('writeTemplate', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-gen-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates the destination file', () => {
    const dest = path.join(tmpDir, 'output.lua');
    writeTemplate('service.lua.tpl', dest, { ServiceName: 'TestService' });
    expect(fs.existsSync(dest)).toBe(true);
  });

  test('written content contains substituted value', () => {
    const dest = path.join(tmpDir, 'output.lua');
    writeTemplate('service.lua.tpl', dest, { ServiceName: 'TestService' });
    const content = fs.readFileSync(dest, 'utf-8');
    expect(content).toContain('TestService');
  });

  test('creates parent directories automatically', () => {
    const dest = path.join(tmpDir, 'nested', 'dir', 'output.lua');
    writeTemplate('service.lua.tpl', dest, { ServiceName: 'Nested' });
    expect(fs.existsSync(dest)).toBe(true);
  });
});
