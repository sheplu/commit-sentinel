import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { ALLOWED_TYPES, validateCommit } from '../../src/validator.ts';

describe('validateCommit', () => {
  it('accepts feat, fix, and chore commits', () => {
    for (const type of ALLOWED_TYPES) {
      const result = validateCommit(`${type}: add message`);
      assert.equal(result.valid, true);
      assert.equal(result.parts?.type, type);
      assert.equal(result.parts?.scope, null);
      assert.equal(result.parts?.subject, 'add message');
    }
  });

  it('accepts an optional scope', () => {
    const result = validateCommit('feat(api): add endpoint');
    assert.equal(result.valid, true);
    assert.deepEqual(result.parts, {
      type: 'feat',
      scope: 'api',
      subject: 'add endpoint',
    });
  });

  it('validates the first line of a multi-line commit message', () => {
    const result = validateCommit('fix: patch crash\n\nLong body');
    assert.equal(result.valid, true);
    assert.equal(result.message, 'fix: patch crash');
  });

  it('rejects unsupported commit types', () => {
    const result = validateCommit('docs: update readme');
    assert.equal(result.valid, false);
    assert.equal(result.errors[0]?.kind, 'type');
    assert.match(result.errors[0]?.message ?? '', /Unsupported commit type "docs"/);
    assert.match(result.errors[0]?.suggestion ?? '', /feat, fix, chore/);
  });

  it('rejects messages that do not follow conventional commit shape', () => {
    const result = validateCommit('fix bug');
    assert.equal(result.valid, false);
    assert.equal(result.errors[0]?.kind, 'format');
    assert.match(result.errors[0]?.message ?? '', /type: subject/);
  });

  it('rejects an empty message', () => {
    const result = validateCommit('');
    assert.equal(result.valid, false);
    assert.equal(result.errors[0]?.kind, 'format');
  });
});
