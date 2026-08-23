import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { runCli } from '../helpers/spawn.ts';

describe('CLI e2e', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-e2e-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // ── happy paths ──

  it('exits 0 with --help', async () => {
    const result = await runCli(['--help']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Usage: commit-sentinel/);
    assert.match(result.stdout, /--message/);
    assert.match(result.stdout, /--range/);
    assert.match(result.stdout, /--base/);
  });

  it('exits 0 with --version', async () => {
    const result = await runCli(['--version']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /\d+\.\d+\.\d+/);
  });

  it('exits 0 for a valid message', async () => {
    const result = await runCli(['--message', 'chore: bootstrap project']);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('exits 0 for valid message with scope', async () => {
    const result = await runCli(['--message', 'feat(api): add endpoint']);
    assert.equal(result.exitCode, 0);
  });

  it('reads from stdin when --stdin is passed', async () => {
    const result = await runCli(['--stdin'], 'feat(ui): add button\n');
    assert.equal(result.exitCode, 0);
  });

  it('reads from a commit message file', async () => {
    const messageFile = join(dir, 'message.txt');
    await writeFile(messageFile, 'fix: handle edge case\n', 'utf8');
    const result = await runCli(['--file', messageFile]);
    assert.equal(result.exitCode, 0);
  });

  it('validates HEAD commit by default (no source flag)', async () => {
    const result = await runCli([]);
    // May pass or fail depending on HEAD commit format, but should not crash
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
  });

  it('validates a specific commit with --commit', async () => {
    const result = await runCli(['--commit', 'HEAD']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  // ── output formats ──

  it('outputs JSON with --json for valid message', async () => {
    const result = await runCli(['--message', 'feat: add login', '--json']);
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.valid, true);
    assert.ok(parsed.commit);
    assert.equal(parsed.commit.type, 'feat');
    assert.equal(parsed.commit.subject, 'add login');
  });

  it('outputs JSON with --json for invalid message', async () => {
    const result = await runCli(['--message', 'bad message', '--json']);
    assert.equal(result.exitCode, 2);
    const parsed = JSON.parse(result.stderr);
    assert.equal(parsed.valid, false);
    assert.ok(parsed.errorCount > 0);
    assert.ok(parsed.results.length > 0);
  });

  it('outputs SARIF with --sarif for valid message', async () => {
    const result = await runCli(['--message', 'feat: add login', '--sarif']);
    assert.equal(result.exitCode, 0);
    const sarif = JSON.parse(result.stdout);
    assert.equal(sarif.version, '2.1.0');
    assert.equal(sarif.runs[0].tool.driver.name, 'commit-sentinel');
    assert.equal(sarif.runs[0].results.length, 0);
  });

  it('outputs SARIF with --sarif for invalid message', async () => {
    const result = await runCli(['--message', 'bad message', '--sarif']);
    assert.equal(result.exitCode, 2);
    const sarif = JSON.parse(result.stderr);
    assert.equal(sarif.version, '2.1.0');
    assert.ok(sarif.runs[0].results.length > 0);
    assert.equal(sarif.runs[0].results[0].level, 'error');
  });

  // ── range validation ──

  it('validates a commit range with --range', async () => {
    const result = await runCli(['--range', 'HEAD~1..HEAD']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  it('validates commits with --base shorthand', async () => {
    const result = await runCli(['--base', 'HEAD~1']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  it('reports no commits for empty range', async () => {
    const result = await runCli(['--range', 'HEAD..HEAD']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /No commits found/);
  });

  it('validates range with --json output', async () => {
    const result = await runCli(['--range', 'HEAD~1..HEAD', '--json']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    // Output should be parseable JSON
    const output = result.stdout || result.stderr;
    assert.doesNotThrow(() => JSON.parse(output));
  });

  it('validates range with --sarif output', async () => {
    const result = await runCli(['--range', 'HEAD~1..HEAD', '--sarif']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    const output = result.stdout || result.stderr;
    const sarif = JSON.parse(output);
    assert.equal(sarif.version, '2.1.0');
  });

  // ── config ──

  it('uses custom config with --config', async () => {
    const configContent = `
      export default {
        extends: 'conventional',
        rules: {
          'type-enum': ['error', { allowed: ['feat', 'fix', 'docs', 'refactor'] }],
        },
      };
    `;
    const configPath = join(dir, 'custom.config.ts');
    await writeFile(configPath, configContent);

    // 'docs' is allowed by this config, not by default strict preset
    const result = await runCli(['--message', 'docs: update readme', '--config', configPath]);
    assert.equal(result.exitCode, 0);
  });

  it('rejects type not in custom config', async () => {
    const configContent = `
      export default {
        extends: 'strict',
        rules: {
          'type-enum': ['error', { allowed: ['feat'] }],
        },
      };
    `;
    const configPath = join(dir, 'strict.config.ts');
    await writeFile(configPath, configContent);

    const result = await runCli(['--message', 'fix: something', '--config', configPath]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Unsupported commit type "fix"/);
  });

  // ── negative / error paths ──

  it('exits 2 for invalid format (no colon)', async () => {
    const result = await runCli(['--message', 'fix bug']);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /must match/);
  });

  it('exits 2 for unsupported type', async () => {
    const result = await runCli(['--message', 'refactor: move files']);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Unsupported commit type "refactor"/);
  });

  it('exits 2 for empty message', async () => {
    const result = await runCli(['--message', '']);
    assert.equal(result.exitCode, 2);
  });

  it('exits 1 for non-existent file', async () => {
    const result = await runCli(['--file', join(dir, 'ghost.txt')]);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.length > 0);
  });

  it('exits 1 for non-existent config file', async () => {
    const result = await runCli(['--message', 'feat: ok', '--config', join(dir, 'nope.ts')]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Config file not found|Failed to load/);
  });

  it('exits 1 for unknown flag', async () => {
    const result = await runCli(['--nope']);
    assert.equal(result.exitCode, 1);
  });

  it('exits 1 when multiple sources given', async () => {
    const result = await runCli(['--message', 'feat: x', '--stdin']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Choose only one/);
  });

  it('exits 1 when --json and --sarif combined', async () => {
    const result = await runCli(['--message', 'feat: x', '--json', '--sarif']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Cannot use both/);
  });

  it('exits 1 for invalid git range', async () => {
    const result = await runCli(['--range', 'nonexistent-branch..HEAD']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.length > 0);
  });

  it('exits 1 for invalid commit ref', async () => {
    const result = await runCli(['--commit', 'nonexistent-ref-abc123']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.length > 0);
  });

  it('handles message with only whitespace', async () => {
    const result = await runCli(['--message', '   ']);
    assert.equal(result.exitCode, 2);
  });

  it('handles file with CRLF line endings', async () => {
    const messageFile = join(dir, 'crlf.txt');
    await writeFile(messageFile, 'feat: crlf test\r\n\r\nbody\r\n', 'utf8');
    const result = await runCli(['--file', messageFile]);
    assert.equal(result.exitCode, 0);
  });

  it('handles commit message with unicode', async () => {
    const result = await runCli(['--message', 'feat: ajouter la connexion 🚀']);
    assert.equal(result.exitCode, 0);
  });
});
