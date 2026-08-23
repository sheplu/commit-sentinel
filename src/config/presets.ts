import type { RuleConfig } from '../rules/types.ts';

/** A preset is a named collection of default rule configurations. */
export type Preset = Record<string, RuleConfig>;

/** Minimal preset: only `feat`, `fix`, and `chore` types allowed. */
export const strict: Preset = {
  'format': 'error',
  'type-enum': ['error', { allowed: ['feat', 'fix', 'chore'] }],
  'header-max-length': ['warn', { max: 100 }],
  'subject-min-length': ['error', { min: 1 }],
};

/** Conventional Commits preset: all standard types, sensible defaults. */
export const conventional: Preset = {
  'format': 'error',
  'type-enum': [
    'error',
    {
      allowed: [
        'feat', 'fix', 'build', 'ci', 'docs',
        'perf', 'refactor', 'style', 'test', 'chore',
      ],
    },
  ],
  'header-max-length': ['warn', { max: 100 }],
  'subject-min-length': ['error', { min: 1 }],
  'subject-case': ['warn', { case: 'lower' }],
};

/** Angular commit guidelines preset: stricter casing and header length. */
export const angular: Preset = {
  'format': 'error',
  'type-enum': [
    'error',
    {
      allowed: ['build', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'test'],
    },
  ],
  'header-max-length': ['error', { max: 100 }],
  'subject-min-length': ['error', { min: 1 }],
  'subject-case': ['error', { case: 'lower' }],
};

const presets: Record<string, Preset> = { strict, conventional, angular };

/**
 * Look up a built-in preset by name.
 *
 * @param name - One of `"strict"`, `"conventional"`, or `"angular"`.
 * @returns The preset's rule configuration map.
 * @throws When the name does not match any built-in preset.
 */
export function getPreset(name: string): Preset {
  const preset = presets[name];
  if (!preset) {
    throw new Error(
      `Unknown preset "${name}". Available presets: ${Object.keys(presets).join(', ')}.`,
    );
  }
  return preset;
}
