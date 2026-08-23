import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { scopeEnumRule } from '../../../src/rules/scope-enum.ts';

function run(message: string, allowed: string[]) {
  return scopeEnumRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { allowed },
  });
}

describe('scope-enum rule', () => {
  it('accepts allowed scope', () => {
    assert.equal(run('feat(api): add endpoint', ['api', 'ui']).length, 0);
  });

  it('rejects disallowed scope', () => {
    const problems = run('feat(db): add migration', ['api', 'ui']);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /Scope "db" is not allowed/);
  });

  it('passes when no scope is present', () => {
    assert.equal(run('feat: add login', ['api']).length, 0);
  });

  it('passes with empty allowed list', () => {
    assert.equal(run('feat(anything): goes', []).length, 0);
  });
});
