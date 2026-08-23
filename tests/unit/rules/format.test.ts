import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { formatRule } from '../../../src/rules/format.ts';
import { valid, invalid } from '../../fixtures/messages.ts';

function run(message: string) {
  return formatRule.validate({ commit: parseCommit(message), git: null, options: {} });
}

describe('format rule', () => {
  it('accepts valid conventional commit', () => {
    assert.equal(run(valid.simple).length, 0);
  });

  it('accepts commit with scope', () => {
    assert.equal(run(valid.withScope).length, 0);
  });

  it('rejects malformed message', () => {
    const problems = run(invalid.noColon);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /must match/);
  });

  it('rejects empty message', () => {
    const problems = run(invalid.empty);
    assert.equal(problems.length, 1);
  });
});
