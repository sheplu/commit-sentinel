import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { bodyRequiredRule } from '../../../src/rules/body-required.ts';

function run(message: string) {
  return bodyRequiredRule.validate({ commit: parseCommit(message), git: null, options: {} });
}

describe('body-required rule', () => {
  it('accepts commit with body', () => {
    assert.equal(run('feat: add login\n\nThis adds the login feature.').length, 0);
  });

  it('rejects commit without body', () => {
    const problems = run('feat: add login');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must include a body/);
  });

  it('rejects commit with empty body', () => {
    const problems = run('feat: add login\n\n   ');
    assert.equal(problems.length, 1);
  });
});
