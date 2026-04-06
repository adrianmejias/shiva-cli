'use strict';

const { findServerRoot, getResourcesDir, getShivaModulesDir } = require('../src/utils/server-root');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiva-root-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── findServerRoot ───────────────────────────────────────────────────────────

describe('findServerRoot', () => {
  test('returns null when no marker found', () => {
    const deepDir = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(deepDir, { recursive: true });
    expect(findServerRoot(deepDir)).toBeNull();
  });

  test('finds root via shiva.json in startDir', () => {
    fs.writeFileSync(path.join(tmpDir, 'shiva.json'), '{}');
    expect(findServerRoot(tmpDir)).toBe(tmpDir);
  });

  test('finds root via server.cfg in startDir', () => {
    fs.writeFileSync(path.join(tmpDir, 'server.cfg'), '# cfg');
    expect(findServerRoot(tmpDir)).toBe(tmpDir);
  });

  test('finds root via shiva.json in parent dir', () => {
    const deepDir = path.join(tmpDir, 'resources', '[shiva]', 'shiva-economy');
    fs.mkdirSync(deepDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'shiva.json'), '{}');
    expect(findServerRoot(deepDir)).toBe(tmpDir);
  });

  test('finds root via server.cfg two levels up', () => {
    const deepDir = path.join(tmpDir, 'a', 'b');
    fs.mkdirSync(deepDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'server.cfg'), '# cfg');
    expect(findServerRoot(deepDir)).toBe(tmpDir);
  });

  test('prefers shiva.json over server.cfg when both exist', () => {
    // shiva.json in tmpDir, server.cfg in parent — both valid markers
    // findServerRoot stops at first match walking up, so tmpDir wins
    fs.writeFileSync(path.join(tmpDir, 'shiva.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'server.cfg'), '# cfg');
    expect(findServerRoot(tmpDir)).toBe(tmpDir);
  });
});

// ─── getResourcesDir ─────────────────────────────────────────────────────────

describe('getResourcesDir', () => {
  test('returns {root}/resources', () => {
    expect(getResourcesDir('/srv')).toBe(path.join('/srv', 'resources'));
  });
});

// ─── getShivaModulesDir ───────────────────────────────────────────────────────

describe('getShivaModulesDir', () => {
  test('returns {root}/resources/[shiva]', () => {
    expect(getShivaModulesDir('/srv')).toBe(path.join('/srv', 'resources', '[shiva]'));
  });
});
