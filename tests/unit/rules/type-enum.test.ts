import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { typeEnumRule } from '../../../src/rules/type-enum.ts';
import { valid, invalid } from '../../fixtures/messages.ts';

function run(message: string, allowed: string[]) {
  return typeEnumRule.validate({
    commit: parseCommit(message),
    git: null,
    options: { allowed },
  });
}

describe('type-enum rule', () => {
  it('accepts allowed type', () => {
    assert.equal(run(valid.simple, ['feat', 'fix']).length, 0);
  });

  it('rejects disallowed type', () => {
    const problems = run(invalid.unsupportedType, ['feat', 'fix', 'chore']);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /Unsupported commit type "docs"/);
    assert.match(problems[0]!.suggestion!, /feat, fix, chore/);
  });

  it('skips when type is null (malformed)', () => {
    assert.equal(run(invalid.noColon, ['feat', 'fix']).length, 0);
  });

  it('passes with empty allowed list', () => {
    assert.equal(run('anything: goes', []).length, 0);
  });
});
