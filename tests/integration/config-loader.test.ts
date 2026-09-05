import { strict as assert } from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '../../src/config/loader.ts';
import { validate } from '../../src/runner.ts';

const INDEX_URL = pathToFileURL(
  resolve(import.meta.dirname, '..', '..', 'src', 'index.ts'),
).href;

/** A minimal plugin rule as inline config-file source. */
function pluginSource(name: string, defaultSeverity = 'error'): string {
  return `{
    meta: {
      name: '${name}',
      description: 'Subject must not contain ${name}',
      category: 'content',
      requiresGit: false,
      defaultSeverity: '${defaultSeverity}',
    },
    validate({ commit }) {
      if (commit.subject?.includes('${name}')) {
        return [{ message: 'Found forbidden token "${name}".' }];
      }
      return [];
    },
  }`;
}

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

  it('defaults options to {} for a tuple without options', async () => {
    const configContent = `
      export default {
        extends: 'strict',
        rules: {
          'header-max-length': ['error'],
        },
      };
    `;
    await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

    const config = await loadConfig(dir);
    assert.equal(config.rules['header-max-length']!.severity, 'error');
    assert.deepEqual(config.rules['header-max-length']!.options, {});
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

  describe('plugins', () => {
    it('auto-enables a plugin rule at its default severity', async () => {
      const configContent = `
        export default {
          extends: 'strict',
          plugins: [${pluginSource('no-wip', 'warn')}],
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      const config = await loadConfig(dir);
      assert.ok(config.rules['no-wip']);
      assert.equal(config.rules['no-wip']!.severity, 'warn');
      assert.ok(config.ruleRegistry!.has('no-wip'));
      // Builtins remain in the registry untouched
      assert.ok(config.ruleRegistry!.has('format'));
    });

    it('runs a defineRule() plugin end-to-end through validate()', async () => {
      const configContent = `
        import { defineRule } from '${INDEX_URL}';

        const noWipRule = defineRule({
          meta: {
            name: 'no-wip',
            description: 'Subject must not start with WIP',
            category: 'content',
            requiresGit: false,
            defaultSeverity: 'error',
          },
          validate({ commit }) {
            if (commit.subject?.toUpperCase().startsWith('WIP')) {
              return [{ message: 'WIP commits are not allowed.' }];
            }
            return [];
          },
        });

        export default {
          extends: 'strict',
          plugins: [noWipRule],
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      const config = await loadConfig(dir);
      const failing = validate('feat: WIP do not merge', config);
      assert.equal(failing.valid, false);
      assert.ok(failing.results.some((r) => r.ruleName === 'no-wip'));

      const passing = validate('feat: add login', config);
      assert.equal(passing.valid, true);
    });

    it('lets a rules entry override plugin severity and options', async () => {
      const configContent = `
        export default {
          extends: 'strict',
          plugins: [${pluginSource('no-wip')}],
          rules: {
            'no-wip': ['warn', { strict: true }],
          },
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      const config = await loadConfig(dir);
      assert.equal(config.rules['no-wip']!.severity, 'warn');
      assert.deepEqual(config.rules['no-wip']!.options, { strict: true });
    });

    it('lets a rules entry turn a plugin off', async () => {
      const configContent = `
        export default {
          extends: 'strict',
          plugins: [${pluginSource('no-wip')}],
          rules: {
            'no-wip': 'off',
          },
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      const config = await loadConfig(dir);
      assert.equal(config.rules['no-wip'], undefined);
    });

    it('throws when a plugin name collides with a builtin rule', async () => {
      const configContent = `
        export default {
          plugins: [${pluginSource('type-enum')}],
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      await assert.rejects(
        () => loadConfig(dir),
        /Plugin rule "type-enum" conflicts with a built-in rule/,
      );
    });

    it('throws on duplicate plugin names', async () => {
      const configContent = `
        export default {
          plugins: [${pluginSource('no-wip')}, ${pluginSource('no-wip')}],
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      await assert.rejects(
        () => loadConfig(dir),
        /Duplicate plugin rule "no-wip"/,
      );
    });

    it('throws for unknown rule names in rules', async () => {
      const configContent = `
        export default {
          extends: 'strict',
          rules: {
            'no-such-rule': 'error',
          },
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      await assert.rejects(
        () => loadConfig(dir),
        /Unknown rule "no-such-rule" in config/,
      );
    });

    it('resolves a rules entry that targets a plugin rule', async () => {
      // The unknown-rule check must accept plugin names, not just builtins
      const configContent = `
        export default {
          plugins: [${pluginSource('no-wip')}],
          rules: {
            'no-wip': 'error',
            'format': 'warn',
          },
        };
      `;
      await writeFile(join(dir, 'commit-sentinel.config.ts'), configContent);

      const config = await loadConfig(dir);
      assert.equal(config.rules['no-wip']!.severity, 'error');
      assert.equal(config.rules['format']!.severity, 'warn');
    });

    it('throws for malformed plugin entries', async () => {
      const invalidPlugins = [
        'null',
        '42',
        '{}',
        "{ meta: { name: 42 }, validate() { return []; } }",
        "{ meta: { name: 'no-validate' } }",
      ];

      for (const [index, plugin] of invalidPlugins.entries()) {
        const fileName = `invalid-${index}.config.ts`;
        await writeFile(
          join(dir, fileName),
          `export default { plugins: [${plugin}] };`,
        );
        await assert.rejects(
          () => loadConfig(dir, fileName),
          /Invalid entry in "plugins"/,
          `plugin entry: ${plugin}`,
        );
      }
    });

    it('exposes the builtin registry when config has no plugins', async () => {
      const config = await loadConfig(dir);
      assert.ok(config.ruleRegistry);
      assert.ok(config.ruleRegistry.has('format'));
      assert.equal(config.ruleRegistry.has('no-wip'), false);
    });
  });
});
