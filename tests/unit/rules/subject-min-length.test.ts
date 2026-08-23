import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { subjectMinLengthRule } from '../../../src/rules/subject-min-length.ts';

function run(message: string, min: number) {
  return subjectMinLengthRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { min },
  });
}

describe('subject-min-length rule', () => {
  it('accepts subject meeting minimum', () => {
    assert.equal(run('feat: add login', 3).length, 0);
  });

  it('rejects subject below minimum', () => {
    const problems = run('feat: ab', 5);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must be at least 5/);
  });

  it('skips when subject is null', () => {
    assert.equal(run('bad message', 1).length, 0);
  });
});
