import type { Rule } from './types.ts';

/**
 * Identity helper that provides full type inference for a {@link Rule}.
 *
 * The `Options` generic flows from the `validate` function's context
 * through to the rest of the rule definition, giving autocompletion
 * on `context.options` without manual annotation.
 *
 * @typeParam Options - The shape of the rule-specific options object.
 * @param rule - The rule definition.
 * @returns The same rule, unchanged.
 *
 * @example
 * ```ts
 * export const myRule = defineRule<{ max?: number }>({
 *   meta: { name: 'my-rule', ... },
 *   validate({ commit, options }) {
 *     const max = options.max ?? 72;
 *     // ...
 *   },
 * });
 * ```
 */
export function defineRule<Options = unknown>(rule: Rule<Options>): Rule<Options> {
  return rule;
}
