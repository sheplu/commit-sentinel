import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readCommitMessage, readGitMeta, listCommitsInRange } from '../../src/git.ts';

describe('git operations', () => {
  it('readCommitMessage reads HEAD commit', async () => {
    const message = await readCommitMessage('HEAD');
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 0);
  });

  it('readGitMeta reads author email from HEAD', async () => {
    const meta = await readGitMeta('HEAD');
    assert.equal(typeof meta.authorEmail, 'string');
    assert.ok(meta.authorEmail.includes('@'));
    assert.equal(typeof meta.signed, 'boolean');
  });

  it('listCommitsInRange returns commit SHAs', async () => {
    const shas = await listCommitsInRange('HEAD~1..HEAD');
    assert.ok(Array.isArray(shas));
    assert.equal(shas.length, 1);
    assert.match(shas[0]!, /^[0-9a-f]{40}$/);
  });

  it('readCommitMessage rejects invalid ref', async () => {
    await assert.rejects(
      () => readCommitMessage('nonexistent-ref-abc123'),
    );
  });
});
