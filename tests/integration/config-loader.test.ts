import { strict as assert } from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../../src/config/loader.ts';

describe('loadConfig', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-config-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('falls back to strict preset when no config file', async () => {
    const config = await loadConfig(dir);
    assert.ok(config.rules['format']);
    assert.ok(config.rules['type-enum']);
    assert.equal(config.rules['type-enum']!.severity, 'error');
  });

  it('loads config file from directory', async () => {
    const configContent = `
      export default {
        extends: 'conventional',
        rules: {
          'subject-max-length': ['warn', { max: 50 }],
        },
      };
    `;
    await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

    const config = await loadConfig(dir);
    assert.ok(config.rules['subject-max-length']);
    assert.equal(config.rules['subject-max-length']!.severity, 'warn');
    assert.deepEqual(config.rules['subject-max-length']!.options, { max: 50 });
  });

  it('merges user rules on top of preset', async () => {
    const configContent = `
      export default {
        extends: 'strict',
        rules: {
          'type-enum': ['error', { allowed: ['feat', 'fix'] }],
        },
      };
    `;
    await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

    const config = await loadConfig(dir);
    const typeEnum = config.rules['type-enum']!;
    assert.equal(typeEnum.severity, 'error');
    assert.deepEqual(typeEnum.options, { allowed: ['feat', 'fix'] });
  });

  it('removes rules set to off', async () => {
    const configContent = `
      export default {
        extends: 'strict',
        rules: {
          'format': 'off',
        },
      };
    `;
    await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

    const config = await loadConfig(dir);
    assert.equal(config.rules['format'], undefined);
  });

  it('throws for unknown preset', async () => {
    const configContent = `
      export default {
        extends: 'nonexistent',
      };
    `;
    await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

    await assert.rejects(
      () => loadConfig(dir),
      /Unknown preset "nonexistent"/,
    );
  });

  it('throws when explicit config path does not exist', async () => {
    await assert.rejects(
      () => loadConfig(dir, 'missing.config.ts'),
      /Config file not found/,
    );
  });

  it('throws when config file has syntax error', async () => {
    await writeFile(
      join(dir, 'commit-sentinel.config.ts'),
      'export default {{{ invalid syntax',
    );
    await assert.rejects(
      () => loadConfig(dir),
      /Failed to load config file/,
    );
  });

  it('falls back to strict when config file has no default export', async () => {
    await writeFile(
      join(dir, 'commit-sentinel.config.ts'),
      'export const foo = 42;',
    );
    const config = await loadConfig(dir);
    // No default export → null → falls back to strict
    assert.ok(config.rules['format']);
    assert.ok(config.rules['type-enum']);
  });
});
