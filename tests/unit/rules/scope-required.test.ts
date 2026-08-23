import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { scopeRequiredRule } from '../../../src/rules/scope-required.ts';

function run(message: string) {
  return scopeRequiredRule.validate({ commit: parseCommit(message), git: null, options: {} });
}

describe('scope-required rule', () => {
  it('accepts commit with scope', () => {
    assert.equal(run('feat(api): add endpoint').length, 0);
  });

  it('rejects commit without scope', () => {
    const problems = run('feat: add login');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must include a scope/);
  });

  it('skips when type is null (malformed)', () => {
    assert.equal(run('bad message').length, 0);
  });
});
