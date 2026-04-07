'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { readShivaConfig, writeShivaConfig, readLockfile, writeLockfile, getDatabaseConfig } = require('../src/utils/config-reader');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-cfg-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── readShivaConfig ──────────────────────────────────────────────────────────

describe('readShivaConfig', () => {
  test('reads a valid shiva.json', () => {
    const data = { name: 'my-server', modules: { 'shiva-economy': '^1.0.0' } };
    fs.writeFileSync(path.join(tmpDir, 'shiva.json'), JSON.stringify(data));
    expect(readShivaConfig(tmpDir)).toEqual(data);
  });

  test('throws when shiva.json does not exist', () => {
    expect(() => readShivaConfig(tmpDir)).toThrow('shiva.json not found');
  });

  test('throws on malformed JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'shiva.json'), 'not-json{{{');
    expect(() => readShivaConfig(tmpDir)).toThrow('Failed to parse shiva.json');
  });
});

// ─── writeShivaConfig ─────────────────────────────────────────────────────────

describe('writeShivaConfig', () => {
  test('writes and can be read back', () => {
    const data = { name: 'my-server', modules: {} };
    writeShivaConfig(tmpDir, data);
    expect(readShivaConfig(tmpDir)).toEqual(data);
  });

  test('writes pretty-printed JSON', () => {
    writeShivaConfig(tmpDir, { name: 'test' });
    const raw = fs.readFileSync(path.join(tmpDir, 'shiva.json'), 'utf-8');
    expect(raw).toContain('\n');
  });

  test('overwrites existing config', () => {
    writeShivaConfig(tmpDir, { name: 'old' });
    writeShivaConfig(tmpDir, { name: 'new' });
    expect(readShivaConfig(tmpDir).name).toBe('new');
  });
});

// ─── readLockfile (from config-reader) ────────────────────────────────────────

describe('readLockfile (config-reader)', () => {
  test('returns empty structure when no lockfile exists', () => {
    const lock = readLockfile(tmpDir);
    expect(lock).toEqual({ version: 1, modules: {} });
  });

  test('parses existing lockfile', () => {
    const data = { version: 1, modules: { 'shiva-economy': { version: '2.0.0' } } };
    fs.writeFileSync(path.join(tmpDir, 'shiva.lock'), JSON.stringify(data));
    expect(readLockfile(tmpDir)).toEqual(data);
  });

  test('returns default on corrupt lockfile', () => {
    fs.writeFileSync(path.join(tmpDir, 'shiva.lock'), 'garbage');
    expect(readLockfile(tmpDir)).toEqual({ version: 1, modules: {} });
  });
});

// ─── writeLockfile (from config-reader) ───────────────────────────────────────

describe('writeLockfile (config-reader)', () => {
  test('writes and reads back', () => {
    const data = { version: 1, modules: { 'shiva-fishing': { version: '1.0.0' } } };
    writeLockfile(tmpDir, data);
    expect(readLockfile(tmpDir).modules['shiva-fishing'].version).toBe('1.0.0');
  });
});

// ─── getDatabaseConfig ────────────────────────────────────────────────────────

describe('getDatabaseConfig', () => {
  test('returns database section from shiva.json', () => {
    const db = { host: '127.0.0.1', user: 'root', password: '', database: 'shiva' };
    writeShivaConfig(tmpDir, { name: 'my-server', database: db });
    expect(getDatabaseConfig(tmpDir)).toEqual(db);
  });

  test('returns null when database key is missing', () => {
    writeShivaConfig(tmpDir, { name: 'my-server' });
    expect(getDatabaseConfig(tmpDir)).toBeNull();
  });

  test('returns null when shiva.json does not exist', () => {
    expect(getDatabaseConfig(tmpDir)).toBeNull();
  });
});
