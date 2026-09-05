import type { ParsedCommit } from './parser.ts';
import { parseCommit } from './parser.ts';
import type { GitMeta } from './git.ts';
import type { ActiveSeverity, RuleProblem } from './rules/types.ts';
import type { ResolvedConfig } from './config/loader.ts';
import { builtinRules } from './rules/registry.ts';

/** The outcome of a single rule evaluation against a commit. */
export interface RuleResult {
  /** The rule's unique name. */
  ruleName: string;
  /** The severity this rule was configured with. */
  severity: ActiveSeverity;
  /** Problems found by the rule (non-empty). */
  problems: RuleProblem[];
}

/**
 * Full validation report for a single commit message.
 *
 * {@link valid} is `true` when there are zero errors (warnings are allowed).
 */
export interface ValidationReport {
  /** `true` when {@link errorCount} is zero. */
  valid: boolean;
  /** The parsed commit that was validated. */
  commit: ParsedCommit;
  /** Per-rule results — only rules that found problems appear here. */
  results: RuleResult[];
  /** Total number of error-severity problems across all rules. */
  errorCount: number;
  /** Total number of warning-severity problems across all rules. */
  warningCount: number;
  /** Names of rules that were skipped because {@link GitMeta} was unavailable. */
  skippedGitRules: string[];
}

/**
 * Validate a commit message against a resolved configuration.
 *
 * Pipeline: parse → iterate enabled rules → collect problems → build report.
 *
 * Rules are looked up in {@link ResolvedConfig.ruleRegistry} (built-ins plus
 * any config `plugins`), falling back to the built-in rules when the config
 * carries no registry.
 *
 * Rules with `requiresGit: true` are silently skipped (and listed in
 * {@link ValidationReport.skippedGitRules}) when {@link git} is `null`.
 *
 * @param message - The raw commit message string.
 * @param config - A resolved config (from `loadConfig()`).
 * @param git - Git metadata for the commit, or `null`/`undefined` for message-only validation.
 * @returns A {@link ValidationReport} with all problems and counts.
 */
export function validate(
  message: string,
  config: ResolvedConfig,
  git?: GitMeta | null,
): ValidationReport {
  const commit = parseCommit(message);
  const registry = config.ruleRegistry ?? builtinRules;
  const results: RuleResult[] = [];
  const skippedGitRules: string[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const [ruleName, entry] of Object.entries(config.rules)) {
    const rule = registry.get(ruleName);
    if (!rule) continue;

    if (rule.meta.requiresGit && (git === null || git === undefined)) {
      skippedGitRules.push(ruleName);
      continue;
    }

    const problems = rule.validate({
      commit,
      git: git ?? null,
      options: entry.options,
    });

    if (problems.length > 0) {
      results.push({ ruleName, severity: entry.severity, problems });
      if (entry.severity === 'error') {
        errorCount += problems.length;
      } else {
        warningCount += problems.length;
      }
    }
  }

  return {
    valid: errorCount === 0,
    commit,
    results,
    errorCount,
    warningCount,
    skippedGitRules,
  };
}
