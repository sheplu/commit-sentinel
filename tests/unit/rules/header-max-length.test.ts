import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { headerMaxLengthRule } from '../../../src/rules/header-max-length.ts';

function run(message: string, max: number) {
  return headerMaxLengthRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { max },
  });
}

describe('header-max-length rule', () => {
  it('accepts header within limit', () => {
    assert.equal(run('feat: add login', 100).length, 0);
  });

  it('rejects header exceeding limit', () => {
    const long = `feat: ${'a'.repeat(100)}`;
    const problems = run(long, 100);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /exceeds maximum of 100/);
  });

  it('accepts header at exact limit', () => {
    // 'feat: ' is 6 chars, so subject needs to be 94
    const msg = `feat: ${'a'.repeat(94)}`;
    assert.equal(run(msg, 100).length, 0);
  });
});
