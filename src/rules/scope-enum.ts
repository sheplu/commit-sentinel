import { defineRule } from './define-rule.ts';

interface ScopeEnumOptions {
  allowed?: string[];
}

export const scopeEnumRule = defineRule<ScopeEnumOptions>({
  meta: {
    name: 'scope-enum',
    description: 'Scope must be one of the allowed values',
    category: 'format',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate({ commit, options }) {
    if (commit.scope === null) return [];
    const allowed = options.allowed ?? [];
    if (allowed.length === 0) return [];
    if (allowed.includes(commit.scope)) return [];
    return [
      {
        message: `Scope "${commit.scope}" is not allowed.`,
        suggestion: `Use one of: ${allowed.join(', ')}.`,
      },
    ];
  },
});
