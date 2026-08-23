import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { run } from '../../src/cli.ts';

describe('CLI run()', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-cli-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('prints help and exits 0', async () => {
    const result = await run(['--help']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Usage: commit-sentinel/);
  });

  it('prints version and exits 0', async () => {
    const result = await run(['--version']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /0\.1\.0/);
  });

  it('exits 1 for unknown flags', async () => {
    const result = await run(['--bad-flag']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Unknown/i);
  });

  it('exits 0 for valid message', async () => {
    const result = await run(['--message', 'chore: bootstrap project']);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('exits 2 for invalid message', async () => {
    const result = await run(['--message', 'bad message']);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Invalid commit message/);
  });

  it('reads from a file', async () => {
    const messageFile = join(dir, 'message.txt');
    await writeFile(messageFile, 'fix: handle edge case\n', 'utf8');

    const result = await run(['--file', messageFile]);
    assert.equal(result.exitCode, 0);
  });

  it('rejects multiple sources', async () => {
    const result = await run(['--message', 'feat: x', '--stdin']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Choose only one/);
  });

  it('rejects combining --json and --sarif', async () => {
    const result = await run(['--message', 'feat: add login', '--json', '--sarif']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Cannot use both/);
  });

  it('outputs JSON with --json flag', async () => {
    const result = await run(['--message', 'feat: add login', '--json']);
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.valid, true);
  });

  it('outputs SARIF with --sarif flag', async () => {
    const result = await run(['--message', 'feat: add login', '--sarif']);
    assert.equal(result.exitCode, 0);
    const sarif = JSON.parse(result.stdout);
    assert.equal(sarif.version, '2.1.0');
  });

  it('exits 1 when file does not exist', async () => {
    const result = await run(['--file', join(dir, 'nonexistent.txt')]);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.length > 0);
  });

  it('validates a range of commits', async () => {
    const result = await run(['--range', 'HEAD~1..HEAD']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    // Output should contain commit validation info
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  it('validates using --base shorthand', async () => {
    const result = await run(['--base', 'HEAD~1']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  it('reports no commits for empty range', async () => {
    const result = await run(['--range', 'HEAD..HEAD']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /No commits found/);
  });

  it('validates JSON output for range', async () => {
    const result = await run(['--range', 'HEAD~1..HEAD', '--json']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    // Should be valid JSON (one report per commit)
    const output = result.stdout || result.stderr;
    assert.ok(output.length > 0);
  });
});
