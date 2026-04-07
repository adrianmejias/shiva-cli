'use strict';

const { satisfies, resolveVersion, buildInstallPlan } = require('../src/packages/resolver');

// ─── satisfies ────────────────────────────────────────────────────────────────

describe('satisfies', () => {
  test('returns true for wildcard constraint *',    () => expect(satisfies('1.2.3', '*')).toBe(true));
  test('returns true for empty constraint',         () => expect(satisfies('1.2.3', '')).toBe(true));
  test('returns true for "latest" constraint',      () => expect(satisfies('1.2.3', 'latest')).toBe(true));
  test('returns true for file: constraint',         () => expect(satisfies('file:./local', 'file:./local')).toBe(true));
  test('satisfies ^ constraint',                    () => expect(satisfies('1.2.3', '^1.0.0')).toBe(true));
  test('fails ^ constraint across major',           () => expect(satisfies('2.0.0', '^1.0.0')).toBe(false));
  test('satisfies ~ constraint',                    () => expect(satisfies('1.2.5', '~1.2.0')).toBe(true));
  test('fails ~ constraint across minor',           () => expect(satisfies('1.3.0', '~1.2.0')).toBe(false));
  test('satisfies exact version',                   () => expect(satisfies('1.2.3', '1.2.3')).toBe(true));
  test('fails non-matching exact version',          () => expect(satisfies('1.2.4', '1.2.3')).toBe(false));
  test('satisfies range constraint',                () => expect(satisfies('1.5.0', '>=1.0.0 <2.0.0')).toBe(true));
  test('returns false for invalid constraint',      () => expect(satisfies('1.0.0', 'not_valid')).toBe(false));
});

// ─── resolveVersion ───────────────────────────────────────────────────────────

describe('resolveVersion', () => {
  const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];

  test('returns latest when no constraint',          () => expect(resolveVersion(versions, null)).toBe('2.0.0'));
  test('returns latest for "latest" constraint',     () => expect(resolveVersion(versions, 'latest')).toBe('2.0.0'));
  test('returns file: constraint unchanged',         () => expect(resolveVersion(versions, 'file:./local')).toBe('file:./local'));
  test('resolves ^ to highest matching',             () => expect(resolveVersion(versions, '^1.0.0')).toBe('1.2.0'));
  test('resolves exact version',                     () => expect(resolveVersion(versions, '1.1.0')).toBe('1.1.0'));
  test('returns null when no version matches',       () => expect(resolveVersion(versions, '^3.0.0')).toBeNull());
  test('returns null for empty list',                () => expect(resolveVersion([], '^1.0.0')).toBeNull());
});

// ─── buildInstallPlan ─────────────────────────────────────────────────────────

describe('buildInstallPlan', () => {
  test('resolves direct deps', async () => {
    const fetchVersions = async () => ['1.0.0', '1.1.0'];
    const fetchDeps     = async () => ({});
    const plan = await buildInstallPlan({ 'shiva-fishing': '^1.0.0' }, fetchVersions, fetchDeps);
    expect(plan.get('shiva-fishing')).toBe('1.1.0');
  });

  test('resolves transitive deps', async () => {
    const fetchVersions = async () => ['1.0.0'];
    const fetchDeps     = jest.fn()
      .mockResolvedValueOnce({ 'shiva-core': '^1.0.0' })
      .mockResolvedValueOnce({});
    const plan = await buildInstallPlan({ 'shiva-fishing': '^1.0.0' }, fetchVersions, fetchDeps);
    expect(plan.has('shiva-fishing')).toBe(true);
    expect(plan.has('shiva-core')).toBe(true);
  });

  test('handles file: deps directly', async () => {
    const fetchVersions = async () => [];
    const fetchDeps     = async () => ({});
    const plan = await buildInstallPlan({ 'my-module': 'file:./local' }, fetchVersions, fetchDeps);
    expect(plan.get('my-module')).toBe('file:./local');
  });

  test('deduplicates shared transitive deps', async () => {
    const fetchVersions = async () => ['1.0.0'];
    const fetchDeps     = jest.fn()
      .mockResolvedValueOnce({ 'shared': '^1.0.0' })
      .mockResolvedValueOnce({ 'shared': '^1.0.0' })
      .mockResolvedValueOnce({});
    const plan = await buildInstallPlan(
      { 'a': '^1.0.0', 'b': '^1.0.0' },
      fetchVersions,
      fetchDeps
    );
    expect([...plan.keys()].filter(k => k === 'shared').length).toBe(1);
  });

  test('throws when no version satisfies constraint', async () => {
    const fetchVersions = async () => ['1.0.0'];
    const fetchDeps     = async () => ({});
    await expect(
      buildInstallPlan({ 'shiva-fishing': '^2.0.0' }, fetchVersions, fetchDeps)
    ).rejects.toThrow(/Cannot resolve/);
  });
});
