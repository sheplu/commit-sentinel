import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getPreset, strict, conventional, angular, hardened } from '../../../src/config/presets.ts';
import { builtinRules } from '../../../src/rules/registry.ts';

describe('presets', () => {
  it('strict preset has format and type-enum', () => {
    assert.ok(strict['format']);
    assert.ok(strict['type-enum']);
  });

  it('conventional preset includes all standard types', () => {
    const typeEnum = conventional['type-enum'];
    assert.ok(Array.isArray(typeEnum));
    const [, opts] = typeEnum as [string, { allowed: string[] }];
    assert.ok(opts.allowed.includes('feat'));
    assert.ok(opts.allowed.includes('refactor'));
    assert.ok(opts.allowed.includes('docs'));
  });

  it('angular preset includes angular types', () => {
    const typeEnum = angular['type-enum'];
    assert.ok(Array.isArray(typeEnum));
    const [, opts] = typeEnum as [string, { allowed: string[] }];
    assert.ok(opts.allowed.includes('build'));
    assert.ok(opts.allowed.includes('ci'));
    assert.ok(!opts.allowed.includes('chore'));
  });

  it('conventional and angular presets allow the revert type', () => {
    for (const preset of [conventional, angular]) {
      const typeEnum = preset['type-enum'];
      assert.ok(Array.isArray(typeEnum));
      const [, opts] = typeEnum as [string, { allowed: string[] }];
      assert.ok(opts.allowed.includes('revert'));
    }
  });

  it('strict preset stays minimal without revert', () => {
    const typeEnum = strict['type-enum'];
    assert.ok(Array.isArray(typeEnum));
    const [, opts] = typeEnum as [string, { allowed: string[] }];
    assert.ok(!opts.allowed.includes('revert'));
  });

  it('hardened preset enables every builtin rule', () => {
    assert.deepEqual(
      Object.keys(hardened).sort(),
      [...builtinRules.keys()].sort(),
    );
  });

  it('hardened preset uses error severity everywhere', () => {
    for (const [name, config] of Object.entries(hardened)) {
      const severity = Array.isArray(config) ? config[0] : config;
      assert.equal(severity, 'error', `rule ${name} should be error`);
    }
  });

  it('getPreset returns known preset', () => {
    const preset = getPreset('conventional');
    assert.deepEqual(preset, conventional);
  });

  it('getPreset returns hardened preset', () => {
    assert.deepEqual(getPreset('hardened'), hardened);
  });

  it('getPreset throws for unknown preset', () => {
    assert.throws(() => getPreset('unknown'), /Unknown preset "unknown"/);
  });
});
