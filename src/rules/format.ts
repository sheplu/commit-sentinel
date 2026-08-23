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
    if (commit.type !== null && commit.subject !== null) return [];
    return [
      {
        message: 'Commit message must match "type: subject" or "type(scope): subject".',
        suggestion: 'Example: feat: add login, fix(api): handle timeout.',
      },
    ];
  },
});
