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
