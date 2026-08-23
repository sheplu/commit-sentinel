import { defineRule } from './define-rule.ts';

export const scopeRequiredRule = defineRule({
  meta: {
    name: 'scope-required',
    description: 'Commit must include a scope',
    category: 'format',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate({ commit }) {
    if (commit.type === null) return [];
    if (commit.scope !== null) return [];
    return [
      {
        message: 'Commit must include a scope.',
        suggestion: 'Use the format: type(scope): subject.',
      },
    ];
  },
});
