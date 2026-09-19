import { defineRule } from './define-rule.ts';

interface SubjectMaxLengthOptions {
  max?: number;
}

export const subjectMaxLengthRule = defineRule<SubjectMaxLengthOptions>({
  meta: {
    name: 'subject-max-length',
    description: 'Subject must not exceed the maximum length',
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
    if (commit.subject === null) return [];
    const max = options.max ?? 72;
    if (commit.subject.length <= max) return [];
    return [
      {
        message: `Subject is ${commit.subject.length} characters, exceeds maximum of ${max}.`,
        suggestion: `Shorten the subject to ${max} characters or fewer.`,
      },
    ];
  },
});
