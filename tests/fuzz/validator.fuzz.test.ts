import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import fc from 'fast-check';
import { validate } from '../../src/runner.ts';
import type { ResolvedConfig } from '../../src/config/loader.ts';
import type { ActiveSeverity } from '../../src/rules/types.ts';
import { humanFormatter } from '../../src/formatters/human.ts';
import { jsonFormatter } from '../../src/formatters/json.ts';
import { sarifFormatter } from '../../src/formatters/sarif.ts';

// ── shared configs ──

const emptyConfig: ResolvedConfig = { rules: {} };

const strictConfig: ResolvedConfig = {
  rules: {
    'format': { severity: 'error', options: {} },
    'type-enum': { severity: 'error', options: { allowed: ['feat', 'fix', 'chore'] } },
    'header-max-length': { severity: 'warn', options: { max: 100 } },
    'subject-min-length': { severity: 'error', options: { min: 1 } },
    'subject-case': { severity: 'warn', options: { case: 'lower' } },
  },
};

const allRulesConfig: ResolvedConfig = {
  rules: {
    'format': { severity: 'error', options: {} },
    'type-enum': { severity: 'error', options: { allowed: ['feat', 'fix', 'chore'] } },
    'scope-enum': { severity: 'warn', options: { allowed: ['api', 'ui', 'core'] } },
    'scope-required': { severity: 'warn', options: {} },
    'header-max-length': { severity: 'warn', options: { max: 100 } },
    'subject-max-length': { severity: 'warn', options: { max: 72 } },
    'subject-min-length': { severity: 'error', options: { min: 1 } },
    'subject-case': { severity: 'warn', options: { case: 'lower' } },
    'body-required': { severity: 'warn', options: {} },
    'body-max-line-length': { severity: 'warn', options: { max: 100 } },
    'breaking-change': { severity: 'warn', options: { requireFooter: true } },
    'signed': { severity: 'error', options: {} },
    'author-email': { severity: 'error', options: { pattern: '^.+@.+$' } },
  },
};

describe('validate fuzz', () => {
  // ── structural invariants ──

  it('never throws for arbitrary message with empty config', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, emptyConfig);
        assert.equal(report.valid, true);
        assert.equal(report.errorCount, 0);
        assert.equal(report.warningCount, 0);
        assert.ok(Array.isArray(report.results));
        assert.ok(Array.isArray(report.skippedGitRules));
      }),
      { numRuns: 1000 },
    );
  });

  it('never throws for arbitrary message with strict config', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        assert.equal(typeof report.valid, 'boolean');
        assert.equal(typeof report.errorCount, 'number');
        assert.equal(typeof report.warningCount, 'number');
        assert.ok(report.errorCount >= 0);
        assert.ok(report.warningCount >= 0);
      }),
      { numRuns: 1000 },
    );
  });

  it('never throws for arbitrary message with all rules enabled', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, allRulesConfig, null);
        assert.equal(typeof report.valid, 'boolean');
        assert.ok(report.skippedGitRules.includes('signed'));
        assert.ok(report.skippedGitRules.includes('author-email'));
      }),
      { numRuns: 500 },
    );
  });

  // ── logical invariants ──

  it('valid=true implies errorCount=0', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        if (report.valid) {
          assert.equal(report.errorCount, 0);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('errorCount > 0 implies valid=false', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        if (report.errorCount > 0) {
          assert.equal(report.valid, false);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('errorCount + warningCount = sum of all problems', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, allRulesConfig, null);
        let errors = 0;
        let warnings = 0;
        for (const r of report.results) {
          const count = r.problems.length;
          if (r.severity === 'error') errors += count;
          else warnings += count;
        }
        assert.equal(report.errorCount, errors);
        assert.equal(report.warningCount, warnings);
      }),
      { numRuns: 500 },
    );
  });

  it('git-metadata rules are skipped when git is null', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, allRulesConfig, null);
        assert.equal(report.valid || report.errorCount > 0, true);
        assert.ok(report.skippedGitRules.includes('signed'));
        assert.ok(report.skippedGitRules.includes('author-email'));
      }),
      { numRuns: 200 },
    );
  });

  it('git-metadata rules run when git is provided', () => {
    const gitArb = fc.record({
      authorEmail: fc.stringMatching(/^[a-z]+@[a-z]+\.[a-z]+$/),
      signed: fc.boolean(),
    });

    fc.assert(
      fc.property(fc.string(), gitArb, (message: string, git: { authorEmail: string; signed: boolean }) => {
        const report = validate(message, allRulesConfig, git);
        assert.equal(report.skippedGitRules.length, 0);
      }),
      { numRuns: 200 },
    );
  });

  // ── config variation ──

  it('handles random severity assignments', () => {
    const severityArb = fc.constantFrom('warn', 'error') as fc.Arbitrary<ActiveSeverity>;

    fc.assert(
      fc.property(severityArb, severityArb, (fmtSev: ActiveSeverity, typeSev: ActiveSeverity) => {
        const config: ResolvedConfig = {
          rules: {
            'format': { severity: fmtSev, options: {} },
            'type-enum': { severity: typeSev, options: { allowed: ['feat'] } },
          },
        };
        const report = validate('feat: hello', config);
        assert.equal(typeof report.valid, 'boolean');
      }),
      { numRuns: 100 },
    );
  });
});

describe('formatter fuzz', () => {
  it('humanFormatter never throws for any validation report', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        const output = humanFormatter.format(report, { color: false });
        assert.equal(typeof output, 'string');
        assert.ok(output.length > 0);
      }),
      { numRuns: 500 },
    );
  });

  it('jsonFormatter always produces valid JSON', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        const output = jsonFormatter.format(report);
        assert.doesNotThrow(() => JSON.parse(output));
      }),
      { numRuns: 500 },
    );
  });

  it('sarifFormatter always produces valid SARIF', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        const output = sarifFormatter.format(report);
        const sarif = JSON.parse(output);
        assert.equal(sarif.version, '2.1.0');
        assert.ok(sarif.runs);
        assert.ok(sarif.runs[0].tool);
        assert.ok(Array.isArray(sarif.runs[0].results));
      }),
      { numRuns: 500 },
    );
  });

  it('humanFormatter with color never throws', () => {
    fc.assert(
      fc.property(fc.string(), (message: string) => {
        const report = validate(message, strictConfig);
        const output = humanFormatter.format(report, { color: true });
        assert.equal(typeof output, 'string');
        assert.ok(output.length > 0);
      }),
      { numRuns: 200 },
    );
  });
});
