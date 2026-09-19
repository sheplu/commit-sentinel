import { defineRule } from './define-rule.ts';

interface HeaderMaxLengthOptions {
  max?: number;
}

export const headerMaxLengthRule = defineRule<HeaderMaxLengthOptions>({
  meta: {
    name: 'header-max-length',
    description: 'Header line must not exceed the maximum length',
    category: 'content',
    requiresGit: false,
    defaultSeverity: 'warn',
  },
  validateOptions(options) {
    if (options.max === undefined) return [];
    if (typeof options.max !== 'number' || !Number.isInteger(options.max) || options.max < 1) {
      return [{ message: `"max" must be a positive integer, got: ${JSON.stringify(options.max)}.` }];
    }
    return [];
  },
  validate({ commit, options }) {
    const max = options.max ?? 100;
    if (commit.header.length <= max) return [];
    return [
      {
        message: `Header is ${commit.header.length} characters, exceeds maximum of ${max}.`,
        suggestion: `Shorten the header to ${max} characters or fewer.`,
      },
    ];
  },
});
