import { defineRule } from './define-rule.ts';

export const formatRule = defineRule({
  meta: {
    name: 'format',
    description: 'Commit message must follow conventional commit format',
    category: 'format',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate({ commit }) {
    if (commit.type === null || commit.subject === null) {
      return [
        {
          message: 'Commit message must match "type: subject" or "type(scope): subject".',
          suggestion: 'Example: feat: add login, fix(api): handle timeout.',
        },
      ];
    }

    const problems: { message: string; suggestion?: string }[] = [];

    // Check for proper colon-space separator (not colon-tab or colon-only)
    const afterType = commit.scope !== null
      ? commit.header.indexOf(')') + 1
      : commit.type.length;
    const breakingOffset = commit.breaking ? 1 : 0;
    const separator = commit.header.slice(afterType + breakingOffset, afterType + breakingOffset + 2);
    if (separator !== ': ') {
      problems.push({
        message: 'Type/scope must be followed by ": " (colon and space).',
        suggestion: 'Use "type: subject" or "type(scope): subject".',
      });
    }

    // Check for whitespace-only scope
    if (commit.scope !== null && commit.scope.trim().length === 0) {
      problems.push({
        message: 'Scope must not be empty or whitespace-only.',
        suggestion: 'Provide a meaningful scope or remove the parentheses.',
      });
    }

    // Check for blank line between header and body
    if (commit.body !== null) {
      const lines = commit.raw.split(/\r?\n/);
      if (lines.length > 1 && lines[1]!.trim() !== '') {
        problems.push({
          message: 'Body must be separated from the header by a blank line.',
          suggestion: 'Add a blank line after the header.',
        });
      }
    }

    return problems;
  },
});
