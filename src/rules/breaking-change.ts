import { defineRule } from './define-rule.ts';

interface BreakingChangeOptions {
  requireFooter?: boolean;
}

export const breakingChangeRule = defineRule<BreakingChangeOptions>({
  meta: {
    name: 'breaking-change',
    description: 'Breaking change marker and footer must be consistent',
    category: 'content',
    requiresGit: false,
    defaultSeverity: 'warn',
  },
  validateOptions(options) {
    if (options.requireFooter === undefined) return [];
    if (typeof options.requireFooter !== 'boolean') {
      return [{ message: `"requireFooter" must be a boolean, got: ${JSON.stringify(options.requireFooter)}.` }];
    }
    return [];
  },
  validate({ commit, options }) {
    const problems: { message: string; suggestion?: string }[] = [];
    const requireFooter = options.requireFooter ?? false;

    const breakingFooters = commit.footers.filter(
      (f) => f.token === 'BREAKING CHANGE' || f.token === 'BREAKING-CHANGE',
    );

    // If ! marker is present and footer is required, check for footer
    if (commit.breaking && requireFooter && breakingFooters.length === 0) {
      problems.push({
        message: 'Breaking change marker (!) requires a BREAKING CHANGE footer.',
        suggestion: 'Add a "BREAKING CHANGE: <description>" footer.',
      });
    }

    // Every BREAKING CHANGE footer must have a non-empty description
    for (const footer of breakingFooters) {
      if (footer.value.trim().length === 0) {
        problems.push({
          message: 'BREAKING CHANGE footer must have a non-empty description.',
          suggestion: 'Describe what breaks and how to migrate.',
        });
      }
    }

    return problems;
  },
});
