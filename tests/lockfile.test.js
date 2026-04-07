'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const { readLockfile, writeLockfile, lockModule, unlockModule } = require('../src/packages/lockfile');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-lock-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── readLockfile ─────────────────────────────────────────────────────────────

describe('readLockfile', () => {
  test('returns default structure when no lockfile exists', () => {
    const lock = readLockfile(tmpDir);
    expect(lock).toEqual({ version: 1, modules: {} });
  });

  test('reads existing lockfile', () => {
    const data = { version: 1, modules: { 'shiva-economy': { version: '1.0.0' } } };
    fs.writeFileSync(path.join(tmpDir, 'shiva.lock'), JSON.stringify(data));
    expect(readLockfile(tmpDir)).toEqual(data);
  });

  test('returns default structure on corrupt JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'shiva.lock'), 'not-json');
    expect(readLockfile(tmpDir)).toEqual({ version: 1, modules: {} });
  });
});

// ─── writeLockfile ────────────────────────────────────────────────────────────

describe('writeLockfile', () => {
  test('writes lockfile to disk', () => {
    const data = { version: 1, modules: { 'shiva-fishing': { version: '2.0.0' } } };
    writeLockfile(tmpDir, data);
    const lockPath = path.join(tmpDir, 'shiva.lock');
    expect(fs.existsSync(lockPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    expect(written.modules['shiva-fishing'].version).toBe('2.0.0');
  });

  test('adds updatedAt timestamp', () => {
    writeLockfile(tmpDir, { version: 1, modules: {} });
    const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'shiva.lock'), 'utf-8'));
    expect(typeof written.updatedAt).toBe('string');
  });

  test('round-trips through read', () => {
    const data = { version: 1, modules: { 'shiva-core': { version: '1.0.0', resolved: 'https://example.com' } } };
    writeLockfile(tmpDir, data);
    const lock = readLockfile(tmpDir);
    expect(lock.modules['shiva-core'].version).toBe('1.0.0');
  });
});

// ─── lockModule ──────────────────────────────────────────────────────────────

describe('lockModule', () => {
  test('adds a module entry', () => {
    lockModule(tmpDir, 'shiva-fishing', { version: '1.2.0', resolved: 'https://example.com/pkg.tar.gz' });
    const lock = readLockfile(tmpDir);
    expect(lock.modules['shiva-fishing'].version).toBe('1.2.0');
    expect(lock.modules['shiva-fishing'].resolved).toBe('https://example.com/pkg.tar.gz');
  });

  test('adds lockedAt timestamp', () => {
    lockModule(tmpDir, 'shiva-fishing', { version: '1.0.0' });
    const lock = readLockfile(tmpDir);
    expect(typeof lock.modules['shiva-fishing'].lockedAt).toBe('string');
  });

  test('updates existing entry', () => {
    lockModule(tmpDir, 'shiva-fishing', { version: '1.0.0' });
    lockModule(tmpDir, 'shiva-fishing', { version: '1.1.0' });
    const lock = readLockfile(tmpDir);
    expect(lock.modules['shiva-fishing'].version).toBe('1.1.0');
  });

  test('preserves other modules', () => {
    lockModule(tmpDir, 'shiva-economy', { version: '1.0.0' });
    lockModule(tmpDir, 'shiva-fishing', { version: '2.0.0' });
    const lock = readLockfile(tmpDir);
    expect(lock.modules['shiva-economy'].version).toBe('1.0.0');
    expect(lock.modules['shiva-fishing'].version).toBe('2.0.0');
  });
});

// ─── unlockModule ─────────────────────────────────────────────────────────────

describe('unlockModule', () => {
  test('removes a module entry', () => {
    lockModule(tmpDir, 'shiva-fishing', { version: '1.0.0' });
    unlockModule(tmpDir, 'shiva-fishing');
    const lock = readLockfile(tmpDir);
    expect(lock.modules['shiva-fishing']).toBeUndefined();
  });

  test('is a no-op for non-existent module', () => {
    expect(() => unlockModule(tmpDir, 'shiva-not-there')).not.toThrow();
  });

  test('preserves other modules', () => {
    lockModule(tmpDir, 'shiva-economy', { version: '1.0.0' });
    lockModule(tmpDir, 'shiva-fishing', { version: '1.0.0' });
    unlockModule(tmpDir, 'shiva-fishing');
    const lock = readLockfile(tmpDir);
    expect(lock.modules['shiva-economy'].version).toBe('1.0.0');
  });
});
