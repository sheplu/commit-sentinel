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

  it('rejects separator that is not colon-space', () => {
    const problems = run('feat:\tadd login');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /": "/);
  });

  it('rejects whitespace-only scope', () => {
    const problems = run('feat(   ): add login');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /Scope must not be empty/);
  });

  it('rejects body not separated from header by a blank line', () => {
    const problems = run('feat: add login\nbody without blank line');
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /blank line/);
  });

  it('accepts breaking-change marker without scope', () => {
    assert.equal(run('feat!: drop v1 endpoint').length, 0);
  });

  it('accepts breaking-change marker with scope', () => {
    assert.equal(run('feat(api)!: drop v1 endpoint').length, 0);
  });

  it('reports all structural problems at once', () => {
    const problems = run('feat(  ):\tadd login\nno blank line');
    assert.equal(problems.length, 3);
  });
});
