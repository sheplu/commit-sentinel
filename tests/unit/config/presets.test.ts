import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getPreset, strict, conventional, angular } from '../../../src/config/presets.ts';

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

  it('getPreset returns known preset', () => {
    const preset = getPreset('conventional');
    assert.deepEqual(preset, conventional);
  });

  it('getPreset throws for unknown preset', () => {
    assert.throws(() => getPreset('unknown'), /Unknown preset "unknown"/);
  });
});
