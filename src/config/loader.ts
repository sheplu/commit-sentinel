import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ActiveSeverity, RuleConfig } from '../rules/types.ts';
import type { UserConfig } from './define-config.ts';
import { getPreset, strict } from './presets.ts';

/** A single rule entry after preset merging and normalization. */
export interface ResolvedRuleEntry {
  /** The active severity for this rule. */
  severity: ActiveSeverity;
  /** Rule-specific options (may be `{}` when defaults apply). */
  options: unknown;
}

/** Fully resolved configuration ready for the validation runner. */
export interface ResolvedConfig {
  /** Map of rule name → resolved entry. Rules set to `'off'` are excluded. */
  rules: Record<string, ResolvedRuleEntry>;
}

const CONFIG_FILE = 'commit-sentinel.config.ts';

/**
 * Discover, load, and resolve a commit-sentinel configuration.
 *
 * Resolution order:
 * 1. Look for `commit-sentinel.config.ts` in {@link cwd} (or an explicit {@link configPath}).
 * 2. If found, `import()` it and read its default export.
 * 3. Resolve the `extends` preset, then merge user overrides on top.
 * 4. If no config file is found, fall back to the `strict` preset.
 *
 * @param cwd - Directory to search for the config file. Defaults to `process.cwd()`.
 * @param configPath - Explicit path to a config file (relative to `cwd`).
 * @returns A fully resolved config with only active rules.
 * @throws When an explicit `configPath` does not exist, or the config file fails to import.
 */
export async function loadConfig(cwd?: string, configPath?: string): Promise<ResolvedConfig> {
  const dir = cwd ?? process.cwd();
  const userConfig = await loadUserConfig(dir, configPath);

  if (userConfig === null) {
    return resolveConfig({ extends: undefined, rules: undefined }, strict);
  }

  const presetName = userConfig.extends;
  const preset = presetName ? getPreset(presetName) : strict;
  return resolveConfig(userConfig, preset);
}

async function loadUserConfig(
  dir: string,
  configPath?: string,
): Promise<UserConfig | null> {
  const filePath = configPath ? resolve(dir, configPath) : resolve(dir, CONFIG_FILE);

  try {
    await access(filePath);
  } catch {
    if (configPath) {
      throw new Error(`Config file not found: ${filePath}`);
    }
    return null;
  }

  try {
    const mod = (await import(filePath)) as { default?: UserConfig };
    return mod.default ?? null;
  } catch (err) {
    throw new Error(
      `Failed to load config file "${filePath}": ${(err as Error).message}`,
    );
  }
}

function resolveConfig(
  userConfig: UserConfig,
  preset: Record<string, RuleConfig>,
): ResolvedConfig {
  const merged: Record<string, RuleConfig> = { ...preset };

  // Apply user overrides
  if (userConfig.rules) {
    for (const [name, config] of Object.entries(userConfig.rules)) {
      merged[name] = config;
    }
  }

  // Normalize to ResolvedRuleEntry, filtering out 'off' rules
  const rules: Record<string, ResolvedRuleEntry> = {};
  for (const [name, config] of Object.entries(merged)) {
    const entry = normalizeRuleConfig(config);
    if (entry !== null) {
      rules[name] = entry;
    }
  }

  return { rules };
}

function normalizeRuleConfig(config: RuleConfig): ResolvedRuleEntry | null {
  if (config === 'off') return null;
  if (config === 'warn') return { severity: 'warn', options: {} };
  if (config === 'error') return { severity: 'error', options: {} };
  // Tuple form: [severity, options]
  return { severity: config[0], options: config[1] ?? {} };
}
