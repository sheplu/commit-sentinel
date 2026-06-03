import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

const BIN = resolve(import.meta.dirname, '..', '..', 'index.ts');

interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], input?: string): Promise<SpawnResult> {
  return new Promise((resolveSpawn, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => resolveSpawn({ exitCode: code ?? 0, stdout, stderr }));
    child.stdin.end(input);
  });
}

describe('CLI integration', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-integration-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('exits 0 with --help', async () => {
    const result = await runCli(['--help']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Usage: commit-sentinel/);
  });

  it('exits 0 for a valid message', async () => {
    const result = await runCli(['--message', 'chore: bootstrap project']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Valid commit message/);
    assert.equal(result.stderr, '');
  });

  it('exits 2 for an invalid message', async () => {
    const result = await runCli(['--message', 'refactor: move files']);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Unsupported commit type "refactor"/);
  });

  it('reads from stdin when --stdin is passed', async () => {
    const result = await runCli(['--stdin'], 'feat(ui): add button\n');
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /feat\(ui\): add button/);
  });

  it('reads from a commit message file', async () => {
    const messageFile = join(dir, 'message.txt');
    await writeFile(messageFile, 'fix: handle edge case\n', 'utf8');

    const result = await runCli(['--file', messageFile]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /fix: handle edge case/);
  });
});
