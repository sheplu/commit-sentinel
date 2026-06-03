import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { run } from '../../src/cli.ts';

describe('cli.run', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('prints help with --help', async () => {
    const result = await run(['--help']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Usage: commit-sentinel/);
    assert.match(result.stdout, /feat, fix, chore/);
  });

  it('prints version with --version', async () => {
    const result = await run(['--version']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /^\d+\.\d+\.\d+/);
  });

  it('returns exitCode 1 with help text on unknown flag', async () => {
    const result = await run(['--no-such-flag']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Usage: commit-sentinel/);
  });

  it('validates a message provided with --message', async () => {
    const result = await run(['--message', 'feat: add cli']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Valid commit message/);
  });

  it('rejects an invalid message provided with --message', async () => {
    const result = await run(['--message', 'docs: update readme']);
    assert.equal(result.exitCode, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Invalid commit message/);
    assert.match(result.stderr, /Unsupported commit type "docs"/);
  });

  it('validates a message from --file', async () => {
    const path = join(dir, 'COMMIT_EDITMSG');
    await writeFile(path, 'fix: repair bug\n\nBody text', 'utf8');

    const result = await run(['--file', path]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /fix: repair bug/);
  });

  it('rejects multiple message sources', async () => {
    const result = await run(['--message', 'feat: add cli', '--file', 'message.txt']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Choose only one commit message source/);
  });
});
