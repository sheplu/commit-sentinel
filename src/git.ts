import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Reject option-shaped refs to prevent Git argument injection (F10).
 * Refs starting with `-` could be interpreted as Git options.
 */
function assertSafeRef(ref: string): void {
  if (ref.startsWith('-')) {
    throw new Error(`Invalid git ref: "${ref}". Refs must not start with "-".`);
  }
}

/** Metadata about a git commit that is not part of the commit message itself. */
export interface GitMeta {
  /** The author email address (`git log --format=%ae`). */
  authorEmail: string;
  /** `true` when the commit carries a cryptographic signature (GPG or SSH). */
  signed: boolean;
}

/**
 * Read the full commit message for a given git ref.
 *
 * Uses `git log -1` which naturally dereferences annotated tags to their
 * target commit, avoiding the `git show` pitfall of including tag metadata.
 *
 * @param ref - A git ref (SHA, branch, tag, or `HEAD`). Defaults to `"HEAD"`.
 * @returns The raw commit message including body and footers.
 * @throws When the ref does not exist or `git` is not available.
 */
export async function readCommitMessage(ref = 'HEAD'): Promise<string> {
  assertSafeRef(ref);
  const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%B', ref, '--'], {
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

/**
 * Parse raw `git show -s --format=%ae%n%GK` output into a {@link GitMeta}.
 *
 * Fields are split before trimming so that an empty author email is preserved
 * as an empty string instead of being shifted by a leading newline.
 *
 * @param stdout - The raw `git show` output (author email line, then signer key ID).
 * @returns The parsed {@link GitMeta}.
 */
export function parseGitMeta(stdout: string): GitMeta {
  const lines = stdout.split('\n');
  const authorEmail = lines[0];
  // %GK returns the signer key ID — non-empty when a signature is present,
  // regardless of whether the key can be verified locally.
  const sigKey = (lines[1] ?? '').trim();
  const signed = sigKey.length > 0;

  return { authorEmail, signed };
}

/**
 * Read git metadata (author email, signing status) for a commit.
 *
 * Signing is a **presence check only** — a non-empty signer key ID (`%GK`)
 * indicates a signature exists, regardless of local verifier configuration.
 *
 * Uses `git log -1` which naturally dereferences annotated tags to their
 * target commit, avoiding the `git show` pitfall of including tag metadata.
 *
 * @param ref - A git ref. Defaults to `"HEAD"`.
 * @returns The commit's {@link GitMeta}.
 * @throws When the ref does not exist or `git` is not available.
 */
export async function readGitMeta(ref = 'HEAD'): Promise<GitMeta> {
  assertSafeRef(ref);
  const { stdout } = await execFileAsync(
    'git',
    ['log', '-1', '--format=%ae%n%GK', ref, '--'],
    { maxBuffer: 1024 * 1024 },
  );
  return parseGitMeta(stdout);
}

/**
 * Read git metadata, returning `null` when it is unavailable (bad ref, not a
 * git repository, or `git` is missing) instead of throwing.
 *
 * Callers use this so that git-metadata rules can be skipped gracefully.
 *
 * @param ref - A git ref. Defaults to `"HEAD"`.
 */
export async function readGitMetaOrNull(ref = 'HEAD'): Promise<GitMeta | null> {
  try {
    return await readGitMeta(ref);
  } catch {
    return null;
  }
}

/**
 * List commit SHAs in a git range, oldest first.
 *
 * @param range - A git revision range (e.g. `"main..HEAD"`).
 * @returns An array of full 40-character SHA strings.
 * @throws When the range is invalid or `git` is not available.
 */
export async function listCommitsInRange(range: string): Promise<string[]> {
  assertSafeRef(range);
  const { stdout } = await execFileAsync('git', ['rev-list', '--reverse', '--no-merges', range, '--'], {
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim().split('\n').filter((line) => line.length > 0);
}
