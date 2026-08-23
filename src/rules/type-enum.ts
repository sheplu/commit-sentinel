import { defineRule } from './define-rule.ts';

interface TypeEnumOptions {
  allowed?: string[];
}

export const typeEnumRule = defineRule<TypeEnumOptions>({
  meta: {
    name: 'type-enum',
    description: 'Type must be one of the allowed values',
    category: 'format',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate({ commit, options }) {
    if (commit.type === null) return [];
    const allowed = options.allowed ?? [];
    if (allowed.length === 0 || allowed.includes(commit.type)) return [];
    return [
      {
        message: `Unsupported commit type "${commit.type}".`,
        suggestion: `Use one of: ${allowed.join(', ')}.`,
      },
    ];
  },
});
