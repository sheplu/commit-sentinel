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
  validateOptions(options) {
    if (options.allowed === undefined) return [];
    if (!Array.isArray(options.allowed)) {
      return [{ message: '"allowed" must be an array of strings.' }];
    }
    const invalid = options.allowed.filter((v) => typeof v !== 'string');
    if (invalid.length > 0) {
      return [{ message: `"allowed" must contain only strings, got: ${invalid.map((v) => typeof v).join(', ')}.` }];
    }
    if (options.allowed.length === 0) {
      return [{ message: '"allowed" must not be empty — to disable the rule, set it to \'off\' instead.' }];
    }
    return [];
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
