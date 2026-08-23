import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { defineConfig } from '../../../src/config/define-config.ts';

describe('defineConfig', () => {
  it('returns the same config object', () => {
    const config = { extends: 'strict', rules: { format: 'error' as const } };
    assert.deepEqual(defineConfig(config), config);
  });

  it('works with empty config', () => {
    const config = {};
    assert.deepEqual(defineConfig(config), config);
  });
});
