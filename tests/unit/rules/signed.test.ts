import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { signedRule } from '../../../src/rules/signed.ts';

const commit = parseCommit('feat: add login');

describe('signed rule', () => {
  it('returns empty when git is null', () => {
    const problems = signedRule.validate({ commit, git: null, options: {} });
    assert.equal(problems.length, 0);
  });

  it('passes when commit is signed', () => {
    const problems = signedRule.validate({
      commit,
      git: { authorEmail: 'a@b.com', signed: true },
      options: {},
    });
    assert.equal(problems.length, 0);
  });

  it('fails when commit is not signed', () => {
    const problems = signedRule.validate({
      commit,
      git: { authorEmail: 'a@b.com', signed: false },
      options: {},
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /not signed/);
  });
});
