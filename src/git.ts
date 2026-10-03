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
  // --no-show-signature: a user-level `log.showsignature=true` would prepend
  // signature-verification text to stdout, corrupting the parsed output.
  const { stdout } = await execFileAsync(
    'git',
    ['log', '-1', '--no-show-signature', '--format=%B', ref, '--'],
    { maxBuffer: 1024 * 1024 },
  );
  return stdout;
}

/**
 * Parse raw `git log -1 --format=%ae%n%GK` output into a {@link GitMeta}.
 *
 * Fields are split before trimming so that an empty author email is preserved
 * as an empty string instead of being shifted by a leading newline.
 *
 * @param stdout - The raw `git log` output (author email line, then signer key ID).
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
  // --no-show-signature: a user-level `log.showsignature=true` would prepend
  // signature-verification text to stdout, shifting the parsed fields.
  const { stdout } = await execFileAsync(
    'git',
    ['log', '-1', '--no-show-signature', '--format=%ae%n%GK', ref, '--'],
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

/** One commit read from a range: identity, raw message, and git metadata. */
export interface CommitRecord {
  /** Full 40-character commit SHA. */
  sha: string;
  /** The raw commit message — byte-identical to {@link readCommitMessage} output. */
  message: string;
  /** The commit's {@link GitMeta}. */
  meta: GitMeta;
}

// Each record is `\0` + sha, author email, and signer key ID on their own
// lines, followed by the raw message (`%B` plus the tformat terminator).
const RECORD_HEAD = /^([0-9a-f]{40})\n(.*)\n(.*)\n/;

/**
 * Parse raw `git log --format=%x00%H%n%ae%n%GK%n%B` output into
 * {@link CommitRecord}s.
 *
 * Git refuses NUL bytes in commit messages, so `\0` is a safe record
 * delimiter; hand-crafted objects that violate that invariant fail loudly
 * here instead of being misparsed.
 *
 * @param stdout - The raw `git log` output for a range (may be empty).
 * @returns The parsed records, in the order git emitted them.
 * @throws When the output does not match the expected record format.
 */
export function parseCommitRecords(stdout: string): CommitRecord[] {
  if (stdout === '') return [];
  const records = stdout.split('\u0000');
  if (records.shift() !== '') {
    throw new Error('Unexpected git log output: records must start with a NUL delimiter.');
  }
  return records.map((record) => {
    const head = RECORD_HEAD.exec(record);
    if (head === null) {
      throw new Error('Unexpected git log output: malformed commit record.');
    }
    return {
      sha: head[1]!,
      message: record.slice(head[0].length),
      meta: { authorEmail: head[2]!, signed: head[3]!.trim().length > 0 },
    };
  });
}

/**
 * Read every commit in a git range (oldest first, merges excluded) in a
 * single `git log` invocation — sha, raw message, and metadata per commit.
 *
 * Equivalent to {@link listCommitsInRange} plus per-sha
 * {@link readCommitMessage} / {@link readGitMetaOrNull}, without the 2N
 * extra subprocess spawns.
 *
 * @param range - A git revision range (e.g. `"main..HEAD"`).
 * @returns One {@link CommitRecord} per non-merge commit; `[]` for an empty range.
 * @throws When the range is invalid or `git` is not available.
 */
export async function readCommitsInRange(range: string): Promise<CommitRecord[]> {
  assertSafeRef(range);
  const { stdout } = await execFileAsync(
    'git',
    ['log', '--reverse', '--no-merges', '--no-show-signature',
      '--format=%x00%H%n%ae%n%GK%n%B', range, '--'],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return parseCommitRecords(stdout);
}
