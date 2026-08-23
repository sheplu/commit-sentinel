import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { subjectMaxLengthRule } from '../../../src/rules/subject-max-length.ts';

function run(message: string, max: number) {
  return subjectMaxLengthRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { max },
  });
}

describe('subject-max-length rule', () => {
  it('accepts subject within limit', () => {
    assert.equal(run('feat: add login', 72).length, 0);
  });

  it('rejects subject exceeding limit', () => {
    const longSubject = 'a'.repeat(80);
    const problems = run(`feat: ${longSubject}`, 72);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /exceeds maximum of 72/);
  });

  it('accepts subject at exact limit', () => {
    const subject = 'a'.repeat(72);
    assert.equal(run(`feat: ${subject}`, 72).length, 0);
  });

  it('skips when subject is null', () => {
    assert.equal(run('bad message', 72).length, 0);
  });
});
