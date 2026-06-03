import type { CommitMessageParts, CommitType, ValidationProblem, ValidationResult } from './types.ts';

export const ALLOWED_TYPES = ['feat', 'fix', 'chore'] as const satisfies readonly CommitType[];

const COMMIT_PATTERN = /^(?<type>[a-z]+)(?:\((?<scope>[^()\r\n]+)\))?: (?<subject>\S.*)$/;

export function validateCommit(message: string): ValidationResult {
  const normalized = firstLine(message).trim();
  const errors: ValidationProblem[] = [];
  const match = COMMIT_PATTERN.exec(normalized);

  if (!match?.groups) {
    errors.push({
      kind: 'format',
      message: 'Commit message must match "type: subject" or "type(scope): subject".',
      suggestion: 'Use one of: feat: add thing, fix: correct bug, chore: update tooling.',
    });
    return { valid: false, message: normalized, parts: null, errors };
  }

  const rawType = match.groups.type ?? '';
  if (!isCommitType(rawType)) {
    errors.push({
      kind: 'type',
      message: `Unsupported commit type "${rawType}".`,
      suggestion: `Use one of: ${ALLOWED_TYPES.join(', ')}.`,
    });
  }

  const subject = (match.groups.subject ?? '').trim();
  if (subject.length === 0) {
    errors.push({
      kind: 'subject',
      message: 'Commit subject cannot be empty.',
      suggestion: 'Add a short description after the colon.',
    });
  }

  const parts: CommitMessageParts | null = isCommitType(rawType)
    ? {
        type: rawType,
        scope: match.groups.scope ?? null,
        subject,
      }
    : null;

  return {
    valid: errors.length === 0,
    message: normalized,
    parts,
    errors,
  };
}

export function isCommitType(value: string): value is CommitType {
  return ALLOWED_TYPES.includes(value as CommitType);
}

function firstLine(message: string): string {
  return message.split(/\r?\n/, 1)[0] ?? '';
}
