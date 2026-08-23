import { defineRule } from './define-rule.ts';

export const signedRule = defineRule({
  meta: {
    name: 'signed',
    description: 'Commit must be signed',
    category: 'git',
    requiresGit: true,
    defaultSeverity: 'error',
  },
  validate({ git }) {
    if (git === null) return [];
    if (git.signed) return [];
    return [
      {
        message: 'Commit is not signed.',
        suggestion: 'Sign your commits with GPG or SSH: git commit -S.',
      },
    ];
  },
});
