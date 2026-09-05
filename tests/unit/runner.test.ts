import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { validate } from '../../src/runner.ts';
import type { ResolvedConfig } from '../../src/config/loader.ts';
import type { Rule } from '../../src/rules/types.ts';
import { builtinRules } from '../../src/rules/registry.ts';

describe('validate', () => {
  it('returns valid with no rules', () => {
    const config: ResolvedConfig = { rules: {} };
    const report = validate('feat: add login', config);
    assert.equal(report.valid, true);
    assert.equal(report.errorCount, 0);
    assert.equal(report.warningCount, 0);
  });

  it('returns invalid when error rule fails', () => {
    const config: ResolvedConfig = {
      rules: {
        'format': { severity: 'error', options: {} },
      },
    };
    const report = validate('bad message', config);
    assert.equal(report.valid, false);
    assert.equal(report.errorCount, 1);
  });

  it('returns valid with warnings only', () => {
    const config: ResolvedConfig = {
      rules: {
        'subject-case': { severity: 'warn', options: { case: 'lower' } },
      },
    };
    const report = validate('feat: Add Login', config);
    assert.equal(report.valid, true);
    assert.equal(report.warningCount, 1);
  });

  it('skips git-metadata rules when git is null', () => {
    const config: ResolvedConfig = {
      rules: {
        'signed': { severity: 'error', options: {} },
      },
    };
    const report = validate('feat: add login', config, null);
    assert.equal(report.valid, true);
    assert.deepEqual(report.skippedGitRules, ['signed']);
  });

  it('runs git-metadata rules when git is provided', () => {
    const config: ResolvedConfig = {
      rules: {
        'signed': { severity: 'error', options: {} },
      },
    };
    const report = validate('feat: add login', config, {
      authorEmail: 'a@b.com',
      signed: false,
    });
    assert.equal(report.valid, false);
    assert.equal(report.errorCount, 1);
  });

  it('handles mix of errors and warnings', () => {
    const config: ResolvedConfig = {
      rules: {
        'format': { severity: 'error', options: {} },
        'header-max-length': { severity: 'warn', options: { max: 5 } },
      },
    };
    const report = validate('bad message', config);
    assert.equal(report.valid, false);
    assert.equal(report.errorCount, 1);
    assert.equal(report.warningCount, 1);
  });

  it('ignores unknown rule names', () => {
    const config: ResolvedConfig = {
      rules: {
        'nonexistent-rule': { severity: 'error', options: {} },
      },
    };
    const report = validate('feat: add login', config);
    assert.equal(report.valid, true);
    assert.equal(report.results.length, 0);
  });

  describe('custom rules via ruleRegistry', () => {
    const noWipRule: Rule = {
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
    };

    const gitOnlyRule: Rule = {
      meta: {
        name: 'git-only',
        description: 'Needs git metadata',
        category: 'git',
        requiresGit: true,
        defaultSeverity: 'error',
      },
      validate() {
        return [{ message: 'always fails' }];
      },
    };

    const registry = new Map([...builtinRules, ['no-wip', noWipRule], ['git-only', gitOnlyRule]]);

    it('runs a custom rule from the registry', () => {
      const config: ResolvedConfig = {
        rules: {
          'no-wip': { severity: 'error', options: {} },
        },
        ruleRegistry: registry,
      };
      const report = validate('feat: WIP do not merge', config);
      assert.equal(report.valid, false);
      assert.equal(report.errorCount, 1);
      assert.equal(report.results[0]!.ruleName, 'no-wip');
    });

    it('passes when a custom rule finds no problems', () => {
      const config: ResolvedConfig = {
        rules: {
          'no-wip': { severity: 'error', options: {} },
        },
        ruleRegistry: registry,
      };
      const report = validate('feat: add login', config);
      assert.equal(report.valid, true);
      assert.equal(report.results.length, 0);
    });

    it('still runs builtin rules alongside custom rules', () => {
      const config: ResolvedConfig = {
        rules: {
          'format': { severity: 'error', options: {} },
          'no-wip': { severity: 'error', options: {} },
        },
        ruleRegistry: registry,
      };
      const report = validate('bad message', config);
      assert.equal(report.valid, false);
      assert.equal(report.results[0]!.ruleName, 'format');
    });

    it('skips a custom git rule when git is null', () => {
      const config: ResolvedConfig = {
        rules: {
          'git-only': { severity: 'error', options: {} },
        },
        ruleRegistry: registry,
      };
      const report = validate('feat: add login', config, null);
      assert.equal(report.valid, true);
      assert.deepEqual(report.skippedGitRules, ['git-only']);
    });

    it('ignores unknown rule names when a registry is provided', () => {
      const config: ResolvedConfig = {
        rules: {
          'nonexistent-rule': { severity: 'error', options: {} },
        },
        ruleRegistry: registry,
      };
      const report = validate('feat: add login', config);
      assert.equal(report.valid, true);
      assert.equal(report.results.length, 0);
    });
  });
});
