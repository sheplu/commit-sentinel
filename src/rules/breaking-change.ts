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
  validate({ commit, options }) {
    const problems: { message: string; suggestion?: string }[] = [];
    const requireFooter = options.requireFooter ?? false;

    const breakingFooter = commit.footers.find(
      (f) => f.token === 'BREAKING CHANGE' || f.token === 'BREAKING-CHANGE',
    );

    // If ! marker is present and footer is required, check for footer
    if (commit.breaking && requireFooter && !breakingFooter) {
      problems.push({
        message: 'Breaking change marker (!) requires a BREAKING CHANGE footer.',
        suggestion: 'Add a "BREAKING CHANGE: <description>" footer.',
      });
    }

    // If a BREAKING CHANGE footer exists, its value must be non-empty
    if (breakingFooter && breakingFooter.value.trim().length === 0) {
      problems.push({
        message: 'BREAKING CHANGE footer must have a non-empty description.',
        suggestion: 'Describe what breaks and how to migrate.',
      });
    }

    return problems;
  },
});
