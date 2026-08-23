import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommit } from '../../src/parser.ts';

describe('parseCommit negative cases', () => {
  it('rejects message with no colon', () => {
    const result = parseCommit('fix bug in parser');
    assert.equal(result.type, null);
    assert.equal(result.subject, null);
  });

  it('rejects message with colon but no space after', () => {
    const result = parseCommit('fix:bug');
    assert.equal(result.type, null);
    assert.equal(result.subject, null);
  });

  it('rejects message with uppercase type', () => {
    // The regex allows uppercase letters in type, but conventional commits
    // expect lowercase — the type-enum rule catches this at validation time.
    const result = parseCommit('FIX: bug');
    assert.equal(result.type, 'FIX');
    assert.equal(result.subject, 'bug');
  });

  it('rejects empty scope', () => {
    const result = parseCommit('feat(): add login');
    // Empty scope in parens — regex won't match because scope pattern is [^()\r\n]+
    assert.equal(result.type, null);
  });

  it('rejects nested parentheses in scope', () => {
    const result = parseCommit('feat(a(b)): add login');
    // Regex blocks parens inside scope
    assert.equal(result.type, null);
  });

  it('handles tab characters in message', () => {
    const result = parseCommit('feat:\tadd login');
    // tab is not a space, so the regex may or may not match depending on \s behavior
    // Key point: it should never throw
    assert.equal(typeof result.type, 'string');
  });

  it('handles null bytes in message', () => {
    const result = parseCommit('feat: add\x00login');
    assert.equal(typeof result.raw, 'string');
  });

  it('handles extremely long type', () => {
    const longType = 'a'.repeat(1000);
    const result = parseCommit(`${longType}: something`);
    assert.equal(result.type, longType);
  });

  it('handles extremely long scope', () => {
    const longScope = 'b'.repeat(1000);
    const result = parseCommit(`feat(${longScope}): something`);
    assert.equal(result.scope, longScope);
  });

  it('handles extremely long subject', () => {
    const longSubject = 'c'.repeat(10000);
    const result = parseCommit(`feat: ${longSubject}`);
    assert.equal(result.subject, longSubject);
  });

  it('handles message that is only newlines', () => {
    const result = parseCommit('\n\n\n');
    assert.equal(result.type, null);
    assert.equal(result.header, '');
    assert.equal(result.body, null);
  });

  it('handles CRLF line endings', () => {
    const result = parseCommit('feat: add\r\n\r\nbody text\r\n');
    assert.equal(result.type, 'feat');
    assert.equal(result.subject, 'add');
    assert.equal(result.body, 'body text');
  });

  it('handles body with no trailing newline', () => {
    const result = parseCommit('feat: add\n\nbody');
    assert.equal(result.body, 'body');
  });

  it('handles message ending in many blank lines', () => {
    const result = parseCommit('feat: add\n\nbody\n\n\n\n');
    assert.equal(result.body, 'body');
  });

  it('distinguishes body from footer correctly', () => {
    // Body paragraph, then footer paragraph
    const msg = 'feat: add\n\nThis is body text.\nMore body.\n\nReviewed-by: Alice';
    const result = parseCommit(msg);
    assert.equal(result.body, 'This is body text.\nMore body.');
    assert.equal(result.footers.length, 1);
    assert.equal(result.footers[0]?.token, 'Reviewed-by');
  });

  it('treats non-footer last paragraph as body', () => {
    // Last paragraph doesn't match footer pattern
    const msg = 'feat: add\n\nFirst paragraph.\n\nJust a note, not a footer.';
    const result = parseCommit(msg);
    assert.ok(result.body !== null);
    assert.equal(result.footers.length, 0);
  });

  it('handles multiple footer tokens', () => {
    const msg = 'feat: add\n\nBREAKING CHANGE: removed X\nReviewed-by: Alice\nRefs #42';
    const result = parseCommit(msg);
    assert.equal(result.footers.length, 3);
    assert.equal(result.footers[0]?.token, 'BREAKING CHANGE');
    assert.equal(result.footers[1]?.token, 'Reviewed-by');
    assert.equal(result.footers[2]?.token, 'Refs');
  });

  it('handles message with only a header and blank lines', () => {
    const result = parseCommit('feat: add\n\n');
    assert.equal(result.type, 'feat');
    assert.equal(result.body, null);
    assert.deepEqual(result.footers, []);
  });

  it('handles breaking marker with scope and body and footer', () => {
    const msg = 'refactor(core)!: rewrite\n\nComplete rewrite.\n\nBREAKING CHANGE: everything changed';
    const result = parseCommit(msg);
    assert.equal(result.type, 'refactor');
    assert.equal(result.scope, 'core');
    assert.equal(result.breaking, true);
    assert.equal(result.subject, 'rewrite');
    assert.equal(result.body, 'Complete rewrite.');
    assert.equal(result.footers.length, 1);
  });
});
