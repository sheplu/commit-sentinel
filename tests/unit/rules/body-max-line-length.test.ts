import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { bodyMaxLineLengthRule } from '../../../src/rules/body-max-line-length.ts';

function run(message: string, max: number) {
  return bodyMaxLineLengthRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { max },
  });
}

describe('body-max-line-length rule', () => {
  it('accepts body within limit', () => {
    assert.equal(run('feat: add\n\nShort body.', 100).length, 0);
  });

  it('rejects body with long lines', () => {
    const longLine = 'a'.repeat(101);
    const problems = run(`feat: add\n\n${longLine}`, 100);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /exceed the maximum of 100/);
  });

  it('skips when no body', () => {
    assert.equal(run('feat: add', 100).length, 0);
  });

  it('counts violations across multiple lines', () => {
    const longLine = 'a'.repeat(101);
    const problems = run(`feat: add\n\n${longLine}\nok\n${longLine}`, 100);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /2 body line/);
  });
});
