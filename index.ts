#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './src/cli.ts';

export { ALLOWED_TYPES, isCommitType, validateCommit } from './src/validator.ts';
export type {
  CommitMessageParts,
  CommitType,
  ValidationProblem,
  ValidationProblemKind,
  ValidationResult,
} from './src/types.ts';

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await run(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}
