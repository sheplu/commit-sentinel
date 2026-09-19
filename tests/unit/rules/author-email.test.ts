import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../../src/parser.ts';
import { authorEmailRule } from '../../../src/rules/author-email.ts';

const commit = parseCommit('feat: add login');

describe('author-email rule', () => {
  it('returns empty when git is null', () => {
    const problems = authorEmailRule.validate({
      commit,
      git: null,
      options: { pattern: '^.+@company\\.com$' },
    });
    assert.equal(problems.length, 0);
  });

  it('accepts email matching pattern', () => {
    const problems = authorEmailRule.validate({
      commit,
      git: { authorEmail: 'user@company.com', signed: false },
      options: { pattern: '^.+@company\\.com$' },
    });
    assert.equal(problems.length, 0);
  });

  it('rejects email not matching pattern', () => {
    const problems = authorEmailRule.validate({
      commit,
      git: { authorEmail: 'user@gmail.com', signed: false },
      options: { pattern: '^.+@company\\.com$' },
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /does not match pattern/);
  });

  it('reports an invalid regex as a problem instead of throwing', () => {
    const problems = authorEmailRule.validate({
      commit,
      git: { authorEmail: 'user@company.com', signed: false },
      options: { pattern: '(' },
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0]!.message, /Invalid author-email pattern/);
  });

  describe('validateOptions', () => {
    it('returns empty for valid pattern', () => {
      assert.equal(authorEmailRule.validateOptions!({ pattern: '^.+@company\\.com$' }).length, 0);
    });

    it('returns empty for default options', () => {
      assert.equal(authorEmailRule.validateOptions!({}).length, 0);
    });

    it('reports invalid regex', () => {
      const problems = authorEmailRule.validateOptions!({ pattern: '[invalid' });
      assert.equal(problems.length, 1);
      assert.match(problems[0]!.message, /Invalid author-email pattern/);
    });

    it('reports non-string pattern', () => {
      const problems = authorEmailRule.validateOptions!({ pattern: 42 as unknown as string });
      assert.equal(problems.length, 1);
      assert.match(problems[0]!.message, /Invalid author-email pattern/);
    });
  });
});
