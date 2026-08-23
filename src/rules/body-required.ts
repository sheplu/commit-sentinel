import { defineRule } from './define-rule.ts';

export const bodyRequiredRule = defineRule({
  meta: {
    name: 'body-required',
    description: 'Commit must include a body',
    category: 'content',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate({ commit }) {
    if (commit.body !== null && commit.body.trim().length > 0) return [];
    return [
      {
        message: 'Commit must include a body.',
        suggestion: 'Add a blank line after the subject, then describe the change.',
      },
    ];
  },
});
