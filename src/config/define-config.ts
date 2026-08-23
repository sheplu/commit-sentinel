import type { RuleConfig } from '../rules/types.ts';

/**
 * User-facing configuration for commit-sentinel.
 *
 * Loaded from `commit-sentinel.config.ts` in the project root.
 *
 * @example
 * ```ts
 * // commit-sentinel.config.ts
 * import { defineConfig } from '@sheplu/commit-sentinel';
 *
 * export default defineConfig({
 *   extends: 'conventional',
 *   rules: {
 *     'subject-max-length': ['warn', { max: 72 }],
 *     'signed': 'off',
 *   },
 * });
 * ```
 */
export interface UserConfig {
  /** Name of a built-in preset to extend (`"strict"`, `"conventional"`, or `"angular"`). */
  extends?: string;
  /** Per-rule overrides applied on top of the preset. */
  rules?: Record<string, RuleConfig>;
}

/**
 * Identity helper that provides type-safe autocompletion for config files.
 *
 * @param config - The user configuration object.
 * @returns The same config, unchanged.
 */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
