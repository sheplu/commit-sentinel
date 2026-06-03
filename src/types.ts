export type CommitType = 'feat' | 'fix' | 'chore';

export interface CommitMessageParts {
  type: CommitType;
  scope: string | null;
  subject: string;
}

export type ValidationProblemKind = 'format' | 'type' | 'subject';

export interface ValidationProblem {
  kind: ValidationProblemKind;
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  parts: CommitMessageParts | null;
  errors: ValidationProblem[];
}
