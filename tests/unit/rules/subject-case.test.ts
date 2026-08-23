import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { subjectCaseRule } from '../../../src/rules/subject-case.ts';

function run(message: string, caseOption: 'lower' | 'sentence' | 'upper') {
  return subjectCaseRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { case: caseOption },
  });
}

describe('subject-case rule', () => {
  it('accepts lowercase start with lower case', () => {
    assert.equal(run('feat: add login', 'lower').length, 0);
  });

  it('rejects uppercase start with lower case', () => {
    const problems = run('feat: Add login', 'lower');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must start with a lowercase/);
  });

  it('accepts uppercase start with sentence case', () => {
    assert.equal(run('feat: Add login', 'sentence').length, 0);
  });

  it('rejects lowercase start with sentence case', () => {
    const problems = run('feat: add login', 'sentence');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must start with an uppercase/);
  });

  it('accepts fully uppercase with upper case', () => {
    assert.equal(run('feat: ADD LOGIN', 'upper').length, 0);
  });

  it('rejects mixed case with upper case', () => {
    const problems = run('feat: Add Login', 'upper');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must be entirely uppercase/);
  });

  it('accepts non-alphabetic first character regardless of case', () => {
    assert.equal(run('feat: 123 numbers', 'lower').length, 0);
    assert.equal(run('feat: 123 numbers', 'sentence').length, 0);
  });

  it('skips when subject is null', () => {
    assert.equal(run('bad message', 'lower').length, 0);
  });

  it('returns empty for unknown case option', () => {
    const problems = subjectCaseRule.validate({
      commit: parseCommit('feat: add login'),
      git: null,
      options: { case: 'unknown' as 'lower' },
    });
    assert.equal(problems.length, 0);
  });

  it('uses lower as default when no case option provided', () => {
    const problems = subjectCaseRule.validate({
      commit: parseCommit('feat: Add login'),
      git: null,
      options: {},
    });
    assert.equal(problems.length, 1);
  });
});
