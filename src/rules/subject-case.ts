import { defineRule } from './define-rule.ts';

type CaseOption = 'lower' | 'sentence' | 'upper';

interface SubjectCaseOptions {
  case?: CaseOption;
}

export const subjectCaseRule = defineRule<SubjectCaseOptions>({
  meta: {
    name: 'subject-case',
    description: 'Subject must follow the specified casing convention',
    category: 'content',
    requiresGit: false,
    defaultSeverity: 'warn',
  },
  validate({ commit, options }) {
    if (commit.subject === null || commit.subject.length === 0) return [];

    const first = commit.subject[0]!;
    const caseOption = options.case ?? 'lower';

    // Non-alphabetic first character is always acceptable
    if (!/[a-zA-Z]/.test(first)) return [];

    switch (caseOption) {
      case 'lower':
        if (/^[a-z]/.test(first)) return [];
        return [
          {
            message: 'Subject must start with a lowercase letter.',
            suggestion: `Change "${first}" to "${first.toLowerCase()}".`,
          },
        ];
      case 'sentence':
        if (/^[A-Z]/.test(first)) return [];
        return [
          {
            message: 'Subject must start with an uppercase letter.',
            suggestion: `Change "${first}" to "${first.toUpperCase()}".`,
          },
        ];
      case 'upper':
        if (commit.subject === commit.subject.toUpperCase()) return [];
        return [
          {
            message: 'Subject must be entirely uppercase.',
            suggestion: 'Rewrite the subject in uppercase.',
          },
        ];
      default:
        return [];
    }
  },
});
