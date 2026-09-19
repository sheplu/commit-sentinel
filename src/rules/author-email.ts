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
  validateOptions(options) {
    if (options.pattern !== undefined && typeof options.pattern !== 'string') {
      return [
        {
          message: `Invalid author-email pattern: "${String(options.pattern)}". "pattern" must be a string.`,
          suggestion: 'Check the regex syntax in your config.',
        },
      ];
    }
    const pattern = options.pattern ?? '.+';
    try {
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
      new RegExp(pattern);
      return [];
    } catch {
      return [
        {
          message: `Invalid author-email pattern: "${pattern}".`,
          suggestion: 'Check the regex syntax in your config.',
        },
      ];
    }
  },
  validate({ git, options }) {
    if (git === null) return [];
    const pattern = options.pattern ?? '.+';
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
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
