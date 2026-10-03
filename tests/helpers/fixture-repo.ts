import { execFile } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gitEnv } from './git-env.ts';

const execFileAsync = promisify(execFile);

/** Create an empty commit in `dir` with a fixed test identity. */
export function commitIn(dir: string, message: string): Promise<unknown> {
  return execFileAsync(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com',
      'commit', '--allow-empty', '-m', message],
    { cwd: dir, env: gitEnv },
  );
}

/**
 * Create a temp git repository on branch `main` with one empty commit per
 * message (oldest first). The caller owns cleanup (`rm`) and any `chdir`.
 */
export async function createFixtureRepo(
  prefix: string,
  messages: readonly string[],
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  await execFileAsync('git', ['init', '-q', '-b', 'main'], { cwd: dir, env: gitEnv });
  for (const message of messages) {
    await commitIn(dir, message);
  }
  return dir;
}
