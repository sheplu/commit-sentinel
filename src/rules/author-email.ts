import { defineRule } from './define-rule.ts';

interface AuthorEmailOptions {
  pattern?: string;
}

export const authorEmailRule = defineRule<AuthorEmailOptions>({
  meta: {
    name: 'author-email',
    description: 'Author email must match the specified pattern',
    category: 'git',
    requiresGit: true,
    defaultSeverity: 'error',
  },
  validate({ git, options }) {
    if (git === null) return [];
    const pattern = options.pattern ?? '.+';
    const re = new RegExp(pattern);
    if (re.test(git.authorEmail)) return [];
    return [
      {
        message: `Author email "${git.authorEmail}" does not match pattern /${pattern}/.`,
        suggestion: 'Configure your git email with: git config user.email "<valid-email>".',
      },
    ];
  },
});
