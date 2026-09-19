import type { ParsedCommit } from '../parser.ts';
import type { GitMeta } from '../git.ts';

/** Rule severity level. `'off'` disables the rule entirely. */
export type Severity = 'off' | 'warn' | 'error';

/** A severity that is actually active (not `'off'`). */
export type ActiveSeverity = Exclude<Severity, 'off'>;

/**
 * Configuration value for a single rule.
 *
 * - A bare {@link Severity} string uses the rule's built-in default options.
 * - A tuple `[severity, options]` overrides the options.
 *
 * @example
 * ```ts
 * 'error'                              // error with defaults
 * 'off'                                // disabled
 * ['warn', { max: 72 }]               // warning with custom options
 * ```
 */
export type RuleConfig<T = unknown> = Severity | [severity: ActiveSeverity, options: T];

/** Broad category a rule belongs to. */
export type RuleCategory = 'format' | 'content' | 'git';

/** Metadata describing a rule. */
export interface RuleMeta {
  /** Unique rule identifier (e.g. `"type-enum"`, `"subject-max-length"`). */
  name: string;
  /** One-line human-readable description. */
  description: string;
  /** Rule category for grouping. */
  category: RuleCategory;
  /** When `true`, the rule needs {@link GitMeta} and is skipped in message-only mode. */
  requiresGit: boolean;
  /** Severity used when the rule is enabled without an explicit severity. */
  defaultSeverity: ActiveSeverity;
}

/** A single problem reported by a rule. */
export interface RuleProblem {
  /** What is wrong with the commit. */
  message: string;
  /** Actionable hint on how to fix the problem. */
  suggestion?: string;
}

/**
 * Context passed to a rule's {@link Rule.validate | validate} function.
 *
 * @typeParam Options - The shape of the rule-specific options object.
 */
export interface RuleContext<Options = unknown> {
  /** The parsed commit message. */
  commit: ParsedCommit;
  /** Git metadata, or `null` when validating a message string directly. */
  git: GitMeta | null;
  /** Rule-specific options from the resolved config. */
  options: Options;
}

/**
 * A commit-message validation rule.
 *
 * Implement this interface to create a built-in or third-party rule.
 * Use `defineRule()` for type inference.
 *
 * @typeParam Options - The shape of the rule-specific options object.
 */
export interface Rule<Options = unknown> {
  /** Static metadata about the rule. */
  meta: RuleMeta;
  /**
   * Validate rule options at config-load time.
   *
   * Called by the config loader for every enabled rule. Return an empty
   * array when the options are valid; any returned problems cause a hard
   * config error regardless of the rule's severity.
   *
   * Plugin rules are auto-enabled with `{}` options, so this must treat an
   * all-fields-absent object as valid.
   *
   * Optional — rules without it skip early validation.
   */
  validateOptions?(options: Options): RuleProblem[];
  /**
   * Validate a commit and return any problems found.
   *
   * When a rule defines {@link Rule.validateOptions}, the config loader runs
   * it at load time and this method may assume those checks passed — e.g.
   * that option-typed regexes compile. Configs built by hand (bypassing
   * `loadConfig`) skip that step, so rules that compile user-supplied
   * patterns should still catch construction failures and report them as
   * problems rather than throwing.
   */
  validate(context: RuleContext<Options>): RuleProblem[];
}
