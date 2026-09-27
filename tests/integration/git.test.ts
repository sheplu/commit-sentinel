import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { parseGitMeta, readCommitMessage, readGitMeta, readGitMetaOrNull, listCommitsInRange } from '../../src/git.ts';
import { gitEnv } from '../helpers/git-env.ts';

const execFileAsync = promisify(execFile);

describe('parseGitMeta', () => {
  it('parses an unsigned commit (empty key)', () => {
    assert.deepEqual(parseGitMeta('dev@example.com\n\n'), {
      authorEmail: 'dev@example.com',
      signed: false,
    });
  });

  it('treats a non-empty signer key as signed', () => {
    assert.deepEqual(parseGitMeta('dev@example.com\nABCD1234\n'), {
      authorEmail: 'dev@example.com',
      signed: true,
    });
  });

  it('treats an SSH key fingerprint as signed', () => {
    assert.equal(parseGitMeta('dev@example.com\nSHA256:abc123\n').signed, true);
  });

  it('defaults the signer key to empty for single-line output', () => {
    assert.deepEqual(parseGitMeta('dev@example.com'), {
      authorEmail: 'dev@example.com',
      signed: false,
    });
  });

  it('parses empty output', () => {
    assert.deepEqual(parseGitMeta(''), {
      authorEmail: '',
      signed: false,
    });
  });

  it('preserves empty author email (F26)', () => {
    assert.deepEqual(parseGitMeta('\n\n'), {
      authorEmail: '',
      signed: false,
    });
  });

  it('preserves empty author email with a signer key (F26)', () => {
    assert.deepEqual(parseGitMeta('\nABCD1234\n'), {
      authorEmail: '',
      signed: true,
    });
  });
});

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

  it('readGitMetaOrNull returns metadata for a valid ref', async () => {
    const meta = await readGitMetaOrNull('HEAD');
    assert.ok(meta !== null);
    assert.ok(meta!.authorEmail.includes('@'));
  });

  it('readGitMetaOrNull returns null for an invalid ref', async () => {
    assert.equal(await readGitMetaOrNull('nonexistent-ref-abc123'), null);
  });

  it('listCommitsInRange returns commit SHAs', async () => {
    const shas = await listCommitsInRange('HEAD~1..HEAD');
    assert.ok(Array.isArray(shas));
    assert.ok(shas.length >= 1, `Expected at least 1 commit, got ${shas.length}`);
    for (const sha of shas) {
      assert.match(sha, /^[0-9a-f]{40}$/);
    }
  });

  it('listCommitsInRange returns an empty array for an empty range', async () => {
    const shas = await listCommitsInRange('HEAD..HEAD');
    assert.deepEqual(shas, []);
  });

  it('readCommitMessage rejects invalid ref', async () => {
    await assert.rejects(
      () => readCommitMessage('nonexistent-ref-abc123'),
    );
  });
});

describe('merge commits in ranges', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-merge-'));

    const git = (args: string[]) => execFileAsync('git', args, { cwd: dir, env: gitEnv });
    const commit = (message: string) =>
      git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com',
        'commit', '--allow-empty', '-m', message]);

    // main: A -- C -- M (merge of side)
    // side:     \-- B --/
    await git(['init', '-q', '-b', 'main']);
    await commit('feat: first feature');
    await git(['checkout', '-q', '-b', 'side']);
    await commit('feat: side feature');
    await git(['checkout', '-q', 'main']);
    await commit('feat: second feature');
    await git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com',
      'merge', '--no-edit', 'side']);
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(dir, { recursive: true, force: true });
  });

  it('listCommitsInRange excludes merge commits', async () => {
    const shas = await listCommitsInRange('HEAD~2..HEAD');
    assert.equal(shas.length, 2);

    const { stdout: mergeSha } = await execFileAsync('git', ['rev-parse', 'HEAD']);
    assert.ok(!shas.includes(mergeSha.trim()), 'merge commit must not appear in the range');

    const headers = await Promise.all(
      shas.map(async (sha) => (await readCommitMessage(sha)).split('\n')[0]!),
    );
    assert.deepEqual([...headers].sort(), ['feat: second feature', 'feat: side feature']);
  });
});
