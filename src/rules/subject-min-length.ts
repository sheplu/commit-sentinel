import { defineRule } from './define-rule.ts';

interface SubjectMinLengthOptions {
  min?: number;
}

export const subjectMinLengthRule = defineRule<SubjectMinLengthOptions>({
  meta: {
    name: 'subject-min-length',
    description: 'Subject must meet the minimum length',
    category: 'content',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validateOptions(options) {
    if (options.min === undefined) return [];
    if (typeof options.min !== 'number' || !Number.isInteger(options.min) || options.min < 0) {
      return [{ message: `"min" must be a non-negative integer, got: ${JSON.stringify(options.min)}.` }];
    }
    return [];
  },
  validate({ commit, options }) {
    if (commit.subject === null) return [];
    const min = options.min ?? 1;
    if (commit.subject.length >= min) return [];
    return [
      {
        message: `Subject is ${commit.subject.length} characters, must be at least ${min}.`,
        suggestion: 'Add a descriptive subject after the colon.',
      },
    ];
  },
});
