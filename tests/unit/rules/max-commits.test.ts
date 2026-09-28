import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { maxCommitsRule } from '../../../src/rules/max-commits.ts';

function run(commitCount: number, max?: number) {
  return maxCommitsRule.checkRange!({
    range: 'main..HEAD',
    commitCount,
    options: max === undefined ? {} : { max },
  });
}

describe('max-commits rule', () => {
  it('accepts count under the limit', () => {
    assert.equal(run(3, 10).length, 0);
  });

  it('accepts count at the exact limit', () => {
    assert.equal(run(10, 10).length, 0);
  });

  it('rejects count exceeding the limit', () => {
    const problems = run(11, 10);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /main\.\.HEAD/);
    assert.match(problems[0]!.message, /11 commits/);
    assert.match(problems[0]!.message, /exceeds maximum of 10/);
  });

  it('respects a custom max', () => {
    assert.equal(run(3, 2).length, 1);
    assert.equal(run(2, 2).length, 0);
  });

  it('suggests squashing and mentions merge commits', () => {
    const problems = run(5, 2);
    assert.match(problems[0]!.suggestion!, /[Ss]quash/);
    assert.match(problems[0]!.suggestion!, /merge commits are not counted/);
  });

  it('validate() is a no-op for single commits', () => {
    const problems = maxCommitsRule.validate({
      commit: parseCommit('feat: add login'),
      git: null,
      options: {},
    });
    assert.equal(problems.length, 0);
  });

  it('is a range-scoped git rule that does not require git metadata', () => {
    assert.equal(maxCommitsRule.meta.category, 'git');
    assert.equal(maxCommitsRule.meta.requiresGit, false);
    assert.equal(maxCommitsRule.meta.defaultSeverity, 'error');
  });

  describe('validateOptions', () => {
    it('returns empty for valid options', () => {
      assert.equal(maxCommitsRule.validateOptions!({ max: 5 }).length, 0);
    });

    it('returns empty for default options', () => {
      assert.equal(maxCommitsRule.validateOptions!({}).length, 0);
    });

    it('reports non-integer max', () => {
      const problems = maxCommitsRule.validateOptions!({ max: 2.5 });
      assert.equal(problems.length, 1);
      assert.match(problems[0]!.message, /positive integer/);
    });

    it('reports negative max', () => {
      const problems = maxCommitsRule.validateOptions!({ max: -1 });
      assert.equal(problems.length, 1);
    });

    it('reports zero max', () => {
      const problems = maxCommitsRule.validateOptions!({ max: 0 });
      assert.equal(problems.length, 1);
      assert.match(problems[0]!.message, /positive integer/);
    });

    it('reports string max', () => {
      const problems = maxCommitsRule.validateOptions!({ max: '5' as unknown as number });
      assert.equal(problems.length, 1);
      assert.match(problems[0]!.message, /positive integer/);
    });
  });
});
