'use strict';

const { parseAnnotations, toMarkdown, scanModuleAnnotations, collectLuaFiles } = require('../src/utils/lua-annotations');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ─── parseAnnotations ─────────────────────────────────────────────────────────

describe('parseAnnotations', () => {
  test('parses @class with no parent', () => {
    const src = `---@class Economy\n`;
    const { classes } = parseAnnotations(src);
    expect(classes).toHaveLength(1);
    expect(classes[0].name).toBe('Economy');
    expect(classes[0].parent).toBeNull();
  });

  test('parses @class with parent', () => {
    const src = `---@class EconomyService : BaseService\n`;
    const { classes } = parseAnnotations(src);
    expect(classes[0].parent).toBe('BaseService');
  });

  test('parses @class with inline description comment', () => {
    const src = `---@class Boot -- Boot orchestrator\n`;
    const { classes } = parseAnnotations(src);
    expect(classes[0].description).toBe('Boot orchestrator');
  });

  test('parses @field attached to @class', () => {
    const src = `---@class Economy\n---@field _accounts table Internal store\n`;
    const { classes } = parseAnnotations(src);
    expect(classes[0].fields).toHaveLength(1);
    expect(classes[0].fields[0]).toMatchObject({ name: '_accounts', type: 'table', description: 'Internal store' });
  });

  test('parses multiple @fields on a class', () => {
    const src = `---@class Foo\n---@field x number\n---@field y number\n`;
    const { classes } = parseAnnotations(src);
    expect(classes[0].fields).toHaveLength(2);
  });

  test('@field without description sets description to null', () => {
    const src = `---@class Foo\n---@field x number\n`;
    const { classes } = parseAnnotations(src);
    expect(classes[0].fields[0].description).toBeNull();
  });

  test('parses @alias', () => {
    const src = `---@alias AccountType string\n`;
    const { aliases } = parseAnnotations(src);
    expect(aliases).toHaveLength(1);
    expect(aliases[0]).toMatchObject({ name: 'AccountType', type: 'string' });
  });

  test('parses @alias with description', () => {
    const src = `---@alias AccountType string  cash | bank | black\n`;
    const { aliases } = parseAnnotations(src);
    expect(aliases[0].description).toBe('cash | bank | black');
  });

  test('parses @param + @return on a function', () => {
    const src = [
      `---@param source number Player source`,
      `---@return boolean success`,
      `function Economy.addMoney(source) end`,
    ].join('\n');
    const { functions } = parseAnnotations(src);
    expect(functions).toHaveLength(1);
    const fn = functions[0];
    expect(fn.name).toBe('Economy.addMoney');
    expect(fn.params[0]).toMatchObject({ name: 'source', type: 'number', description: 'Player source' });
    expect(fn.returns[0]).toMatchObject({ type: 'boolean', name: 'success' });
  });

  test('parses free-standing doc comment as function description', () => {
    const src = [
      `--- Get the current balance`,
      `---@param id number`,
      `---@return number`,
      `function Economy.getBalance(id) end`,
    ].join('\n');
    const { functions } = parseAnnotations(src);
    expect(functions[0].description).toBe('Get the current balance');
  });

  test('parses function assignment form', () => {
    const src = `---@return nil\nEconomy.reset = function() end\n`;
    const { functions } = parseAnnotations(src);
    expect(functions[0].name).toBe('Economy.reset');
  });

  test('handles unannotated args as type any', () => {
    const src = `function Foo.bar(a, b) end\n`;
    const { functions } = parseAnnotations(src);
    expect(functions[0].params).toHaveLength(2);
    expect(functions[0].params[0]).toMatchObject({ name: 'a', type: 'any' });
  });

  test('multiple @return annotations are collected', () => {
    const src = [
      `---@return boolean ok`,
      `---@return string|nil err`,
      `function Safe.call() end`,
    ].join('\n');
    const { functions } = parseAnnotations(src);
    expect(functions[0].returns).toHaveLength(2);
  });

  test('resets pending annotations after non-annotation line', () => {
    const src = [
      `---@param x number`,
      `local x = 1`,
      `function Foo.noAnnotation() end`,
    ].join('\n');
    const { functions } = parseAnnotations(src);
    expect(functions[0].params).toHaveLength(0);
  });

  test('returns empty results for source with no annotations', () => {
    const src = `-- just a comment\nlocal x = 1\n`;
    const result = parseAnnotations(src);
    expect(result.classes).toHaveLength(0);
    expect(result.functions).toHaveLength(0);
    expect(result.aliases).toHaveLength(0);
  });

  test('file path is recorded on function', () => {
    const src = `function Foo.bar() end\n`;
    const { functions } = parseAnnotations(src, 'sv_foo.lua');
    expect(functions[0].file).toBe('sv_foo.lua');
  });
});

// ─── toMarkdown ───────────────────────────────────────────────────────────────

describe('toMarkdown', () => {
  test('generates heading with module name', () => {
    const api = { classes: [], functions: [], aliases: [] };
    const md  = toMarkdown('shiva-economy', api);
    expect(md).toContain('# shiva-economy API Reference');
  });

  test('includes class heading and fields', () => {
    const api = {
      classes: [{ name: 'Economy', parent: null, description: 'The economy', fields: [{ name: 'balance', type: 'number', description: 'Current balance' }], file: 'sv.lua', line: 1 }],
      functions: [],
      aliases: [],
    };
    const md = toMarkdown('shiva-economy', api);
    expect(md).toContain('### `Economy`');
    expect(md).toContain('The economy');
    expect(md).toContain('`balance`');
  });

  test('includes parent class in heading', () => {
    const api = { classes: [{ name: 'EconomyService', parent: 'BaseService', description: null, fields: [], file: 'sv.lua', line: 1 }], functions: [], aliases: [] };
    const md  = toMarkdown('shiva-economy', api);
    expect(md).toContain('extends BaseService');
  });

  test('includes function signature', () => {
    const api = {
      classes: [],
      functions: [{
        name: 'Economy.getBalance', description: 'Get balance',
        params: [{ name: 'source', type: 'number', description: 'Player' }],
        returns: [{ type: 'number', name: 'balance', description: null }],
        file: 'sv.lua', line: 10,
      }],
      aliases: [],
    };
    const md = toMarkdown('shiva-economy', api);
    expect(md).toContain('`Economy.getBalance(source)`');
    expect(md).toContain('Get balance');
    expect(md).toContain('`source`');
  });

  test('includes aliases section', () => {
    const api = { classes: [], functions: [], aliases: [{ name: 'AccountType', type: 'string', description: 'cash | bank' }] };
    const md  = toMarkdown('shiva-economy', api);
    expect(md).toContain('## Aliases');
    expect(md).toContain('`AccountType`');
  });
});

// ─── scanModuleAnnotations ────────────────────────────────────────────────────

describe('scanModuleAnnotations', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-ann-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns empty results for empty directory', () => {
    const result = scanModuleAnnotations(tmpDir);
    expect(result.classes).toHaveLength(0);
    expect(result.functions).toHaveLength(0);
  });

  test('scans nested lua files', () => {
    const serverDir = path.join(tmpDir, 'server');
    fs.mkdirSync(serverDir);
    fs.writeFileSync(path.join(serverDir, 'sv_economy.lua'), [
      `---@class Economy`,
      `---@param source number`,
      `---@return number`,
      `function Economy.getBalance(source) end`,
    ].join('\n'));
    const result = scanModuleAnnotations(tmpDir);
    expect(result.classes).toHaveLength(1);
    expect(result.functions).toHaveLength(1);
  });

  test('combines results from multiple files', () => {
    fs.writeFileSync(path.join(tmpDir, 'sh_a.lua'), `---@class A\n`);
    fs.writeFileSync(path.join(tmpDir, 'sh_b.lua'), `---@class B\n`);
    const result = scanModuleAnnotations(tmpDir);
    expect(result.classes).toHaveLength(2);
  });
});

// ─── collectLuaFiles ─────────────────────────────────────────────────────────

describe('collectLuaFiles', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-lua-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns empty array for non-existent directory', () => {
    expect(collectLuaFiles('/no/such/path')).toEqual([]);
  });

  test('collects .lua files recursively', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.lua'), '');
    const sub = path.join(tmpDir, 'sub');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'b.lua'), '');
    fs.writeFileSync(path.join(sub, 'c.json'), '');
    const files = collectLuaFiles(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.every(f => f.endsWith('.lua'))).toBe(true);
  });
});
