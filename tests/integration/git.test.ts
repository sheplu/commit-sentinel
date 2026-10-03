import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  parseGitMeta,
  parseCommitRecords,
  readCommitMessage,
  readCommitsInRange,
  readGitMeta,
  readGitMetaOrNull,
  listCommitsInRange,
} from '../../src/git.ts';
import { gitEnv } from '../helpers/git-env.ts';
import { createFixtureRepo } from '../helpers/fixture-repo.ts';

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

describe('parseCommitRecords', () => {
  const SHA_A = 'a'.repeat(40);
  const SHA_B = 'b'.repeat(40);

  it('parses empty output into an empty array', () => {
    assert.deepEqual(parseCommitRecords(''), []);
  });

  it('parses an unsigned record', () => {
    const records = parseCommitRecords(`\u0000${SHA_A}\ndev@example.com\n\nfeat: add login\n\n`);
    assert.deepEqual(records, [{
      sha: SHA_A,
      message: 'feat: add login\n\n',
      meta: { authorEmail: 'dev@example.com', signed: false },
    }]);
  });

  it('treats a non-empty signer key as signed', () => {
    const records = parseCommitRecords(`\u0000${SHA_A}\ndev@example.com\nSHA256:abc123\nfeat: add login\n\n`);
    assert.equal(records[0]!.meta.signed, true);
  });

  it('preserves an empty author email', () => {
    const records = parseCommitRecords(`\u0000${SHA_A}\n\n\nfeat: add login\n\n`);
    assert.deepEqual(records[0]!.meta, { authorEmail: '', signed: false });
  });

  it('parses multiple records with multiline bodies and blank lines', () => {
    const records = parseCommitRecords(
      `\u0000${SHA_A}\na@example.com\n\nfeat: one\n\nbody line\n\nmore body\n\n` +
      `\u0000${SHA_B}\nb@example.com\nABCD1234\nfix: two\n\n`,
    );
    assert.equal(records.length, 2);
    assert.equal(records[0]!.message, 'feat: one\n\nbody line\n\nmore body\n\n');
    assert.equal(records[1]!.sha, SHA_B);
    assert.deepEqual(records[1]!.meta, { authorEmail: 'b@example.com', signed: true });
  });

  it('parses an empty commit message as a bare newline', () => {
    const records = parseCommitRecords(`\u0000${SHA_A}\ndev@example.com\n\n\n`);
    assert.equal(records[0]!.message, '\n');
  });

  it('rejects output that does not start with a NUL delimiter', () => {
    assert.throws(
      () => parseCommitRecords(`${SHA_A}\ndev@example.com\n\nfeat: x\n\n`),
      /must start with a NUL delimiter/,
    );
  });

  it('rejects a malformed record', () => {
    assert.throws(
      () => parseCommitRecords('\u0000not-a-sha\n'),
      /malformed commit record/,
    );
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

  it('readCommitMessage rejects option-shaped refs (F10)', async () => {
    await assert.rejects(
      () => readCommitMessage('--exec=evil'),
      /Refs must not start with "-"/,
    );
  });

  it('listCommitsInRange rejects option-shaped ranges (F10)', async () => {
    await assert.rejects(
      () => listCommitsInRange('--exec=evil..HEAD'),
      /Refs must not start with "-"/,
    );
  });

  it('readCommitsInRange rejects option-shaped ranges (F10)', async () => {
    await assert.rejects(
      () => readCommitsInRange('--exec=evil..HEAD'),
      /Refs must not start with "-"/,
    );
  });

  it('readCommitsInRange rejects an invalid range', async () => {
    await assert.rejects(() => readCommitsInRange('nonexistent-ref-abc123..HEAD'));
  });
});

describe('readCommitsInRange (fixture git repo)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    dir = await createFixtureRepo('commit-sentinel-readrange-', [
      'chore: bootstrap fixture',
      'feat: multiline change\n\nBody line one.\n\nBody line two.',
      'fix: final change',
    ]);
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(dir, { recursive: true, force: true });
  });

  it('matches the per-sha readers exactly, oldest first', async () => {
    const records = await readCommitsInRange('HEAD~2..HEAD');
    const shas = await listCommitsInRange('HEAD~2..HEAD');
    assert.deepEqual(records.map((r) => r.sha), shas);

    for (const record of records) {
      // Byte-identical message and equal metadata to the single-spawn readers.
      assert.equal(record.message, await readCommitMessage(record.sha));
      assert.deepEqual(record.meta, await readGitMetaOrNull(record.sha));
    }
    assert.match(records[0]!.message, /Body line one\.\n\nBody line two\./);
    assert.equal(records[0]!.meta.authorEmail, 'test@example.com');
    assert.equal(records[0]!.meta.signed, false);
  });

  it('returns an empty array for an empty range', async () => {
    assert.deepEqual(await readCommitsInRange('HEAD..HEAD'), []);
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

  it('readCommitsInRange excludes merge commits', async () => {
    const records = await readCommitsInRange('HEAD~2..HEAD');
    assert.deepEqual(records.map((r) => r.sha), await listCommitsInRange('HEAD~2..HEAD'));
    assert.ok(records.every((r) => !r.message.includes('Merge branch')));
  });
});
