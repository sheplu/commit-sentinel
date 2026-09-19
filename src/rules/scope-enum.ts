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
  validateOptions(options) {
    if (options.allowed === undefined) return [];
    if (!Array.isArray(options.allowed)) {
      return [{ message: '"allowed" must be an array of strings.' }];
    }
    const invalid = options.allowed.filter((v) => typeof v !== 'string');
    if (invalid.length > 0) {
      return [{ message: `"allowed" must contain only strings, got: ${invalid.map((v) => typeof v).join(', ')}.` }];
    }
    return [];
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
