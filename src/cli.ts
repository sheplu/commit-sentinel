import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { readCommitMessage } from './git.ts';
import { ALLOWED_TYPES, validateCommit } from './validator.ts';
import type { ValidationResult } from './types.ts';

const HELP = `Usage: commit-sentinel [options]

Validate git commit messages.

Options:
  -m, --message <message>    Validate a commit message string
  -F, --file <path>          Validate the first line from a commit message file
  -c, --commit <ref>         Validate a git commit message (default: HEAD)
      --stdin                Read the commit message from stdin
  -h, --help                 Show help
  -v, --version              Show version number

Allowed types: ${ALLOWED_TYPES.join(', ')}
Examples:
  commit-sentinel --message "feat: add login"
  commit-sentinel --file .git/COMMIT_EDITMSG
  commit-sentinel --commit HEAD
`;

const VERSION = '0.1.0';

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function run(argv: ReadonlyArray<string>): Promise<RunResult> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: [...argv],
      options: {
        message: { type: 'string', short: 'm' },
        file: { type: 'string', short: 'F' },
        commit: { type: 'string', short: 'c' },
        stdin: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${(err as Error).message}\n${HELP}`,
    };
  }

  const values = parsed.values as {
    message?: string;
    file?: string;
    commit?: string;
    stdin: boolean;
    help: boolean;
    version: boolean;
  };

  if (values.help) return { exitCode: 0, stdout: HELP, stderr: '' };
  if (values.version) return { exitCode: 0, stdout: `${VERSION}\n`, stderr: '' };

  const sourceCount = [values.message, values.file, values.commit, values.stdin ? 'stdin' : undefined]
    .filter((value) => value !== undefined).length;

  if (sourceCount > 1) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Choose only one commit message source: --message, --file, --commit, or --stdin.\n',
    };
  }

  try {
    const message = await resolveMessage(values);
    const result = validateCommit(message);
    if (result.valid) {
      return {
        exitCode: 0,
        stdout: `Valid commit message: ${result.message}\n`,
        stderr: '',
      };
    }

    return {
      exitCode: 2,
      stdout: '',
      stderr: formatValidationErrors(result),
    };
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${(err as Error).message}\n`,
    };
  }
}

async function resolveMessage(values: {
  message?: string;
  file?: string;
  commit?: string;
  stdin: boolean;
}): Promise<string> {
  if (values.message !== undefined) return values.message;
  if (values.file !== undefined) return readFile(values.file, 'utf8');
  if (values.stdin) return readStdin();
  return readCommitMessage(values.commit ?? 'HEAD');
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function formatValidationErrors(result: ValidationResult): string {
  const message = result.message.length > 0 ? result.message : '<empty>';
  const lines = [
    `Invalid commit message: ${message}`,
    '',
    ...result.errors.flatMap((error) => [
      `- ${error.message}`,
      `  Suggestion: ${error.suggestion}`,
    ]),
  ];
  return `${lines.join('\n')}\n`;
}
