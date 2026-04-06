'use strict';

const { parseModuleManifest, parseFxManifest, scanModules } = require('../src/utils/lua-parser');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-parser-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── parseModuleManifest ──────────────────────────────────────────────────────

describe('parseModuleManifest', () => {
  test('returns null for non-existent file', () => {
    expect(parseModuleManifest('/no/such/file.lua')).toBeNull();
  });

  test('parses name and version', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return {\n  name = 'shiva-economy',\n  version = '1.2.3',\n}\n`);
    const result = parseModuleManifest(p);
    expect(result.name).toBe('shiva-economy');
    expect(result.version).toBe('1.2.3');
  });

  test('parses description and author', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return {\n  description = 'Economy',\n  author = 'Shiva',\n}\n`);
    const result = parseModuleManifest(p);
    expect(result.description).toBe('Economy');
    expect(result.author).toBe('Shiva');
  });

  test('parses dependencies array', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return {\n  dependencies = { 'shiva-core', 'shiva-player' },\n}\n`);
    const result = parseModuleManifest(p);
    expect(result.dependencies).toEqual(['shiva-core', 'shiva-player']);
  });

  test('returns empty array for missing dependencies key', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return { name = 'x' }\n`);
    const result = parseModuleManifest(p);
    expect(result.dependencies).toEqual([]);
  });

  test('parses events array', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return {\n  events = { 'economy:balanceChanged', 'economy:transfer' },\n}\n`);
    const result = parseModuleManifest(p);
    expect(result.events).toEqual(['economy:balanceChanged', 'economy:transfer']);
  });

  test('returns empty array for missing events key', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return { name = 'x' }\n`);
    const result = parseModuleManifest(p);
    expect(result.events).toEqual([]);
  });

  test('returns null for missing string keys', () => {
    const p = path.join(tmpDir, 'module.lua');
    fs.writeFileSync(p, `return {}\n`);
    const result = parseModuleManifest(p);
    expect(result.name).toBeNull();
    expect(result.version).toBeNull();
  });
});

// ─── parseFxManifest ──────────────────────────────────────────────────────────

describe('parseFxManifest', () => {
  test('returns null for non-existent file', () => {
    expect(parseFxManifest('/no/such/file.lua')).toBeNull();
  });

  test('parses fx_version', () => {
    const p = path.join(tmpDir, 'fxmanifest.lua');
    fs.writeFileSync(p, `fx_version 'cerulean'\ngame 'gta5'\n`);
    const result = parseFxManifest(p);
    expect(result.fxVersion).toBe('cerulean');
    expect(result.game).toBe('gta5');
  });

  test('parses name/resource field', () => {
    const p = path.join(tmpDir, 'fxmanifest.lua');
    fs.writeFileSync(p, `fx_version 'cerulean'\ngame 'gta5'\nresource 'shiva-economy'\n`);
    const result = parseFxManifest(p);
    expect(result.name).toBe('shiva-economy');
  });

  test('prefers name over resource', () => {
    const p = path.join(tmpDir, 'fxmanifest.lua');
    fs.writeFileSync(p, `fx_version 'cerulean'\ngame 'gta5'\nname 'preferred'\nresource 'fallback'\n`);
    const result = parseFxManifest(p);
    expect(result.name).toBe('preferred');
  });

  test('parses version and description', () => {
    const p = path.join(tmpDir, 'fxmanifest.lua');
    fs.writeFileSync(p, `fx_version 'cerulean'\ngame 'gta5'\nversion '2.0.0'\ndescription 'Economy module'\n`);
    const result = parseFxManifest(p);
    expect(result.version).toBe('2.0.0');
    expect(result.description).toBe('Economy module');
  });

  test('returns null for missing optional fields', () => {
    const p = path.join(tmpDir, 'fxmanifest.lua');
    fs.writeFileSync(p, `fx_version 'cerulean'\ngame 'gta5'\n`);
    const result = parseFxManifest(p);
    expect(result.name).toBeNull();
    expect(result.version).toBeNull();
  });
});

// ─── scanModules ─────────────────────────────────────────────────────────────

describe('scanModules', () => {
  test('returns empty array for non-existent directory', () => {
    expect(scanModules('/no/such/dir')).toEqual([]);
  });

  test('returns empty array when [shiva] dir is absent', () => {
    expect(scanModules(tmpDir)).toEqual([]);
  });

  test('finds modules in resources/[shiva]/', () => {
    const shivaDir = path.join(tmpDir, '[shiva]');
    const modDir   = path.join(shivaDir, 'shiva-economy');
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(path.join(modDir, 'module.lua'), `return { name = 'shiva-economy', version = '1.0.0' }\n`);

    const results = scanModules(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('shiva-economy');
    expect(results[0].manifest.version).toBe('1.0.0');
  });

  test('skips directories without module.lua', () => {
    const shivaDir = path.join(tmpDir, '[shiva]');
    const noManDir = path.join(shivaDir, 'some-resource');
    fs.mkdirSync(noManDir, { recursive: true });
    // no module.lua

    const results = scanModules(tmpDir);
    expect(results).toHaveLength(0);
  });

  test('scans other [category] dirs for compatibility', () => {
    const otherDir = path.join(tmpDir, '[standalone]');
    const modDir   = path.join(otherDir, 'my-module');
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(path.join(modDir, 'module.lua'), `return { name = 'my-module', version = '0.1.0' }\n`);

    const results = scanModules(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('my-module');
  });

  test('falls back to directory name when manifest has no name', () => {
    const shivaDir = path.join(tmpDir, '[shiva]');
    const modDir   = path.join(shivaDir, 'shiva-police');
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(path.join(modDir, 'module.lua'), `return { version = '1.0.0' }\n`);

    const results = scanModules(tmpDir);
    expect(results[0].name).toBe('shiva-police');
  });
});
