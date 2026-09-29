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
 * Context passed to a rule's {@link Rule.checkRange | checkRange} function.
 *
 * Only built for range validation (`--range` / `--base`); single-message
 * modes never invoke range-scoped rules.
 *
 * @typeParam Options - The shape of the rule-specific options object.
 */
export interface RangeRuleContext<Options = unknown> {
  /** The git revision range being validated (e.g. `"main..HEAD"`; `--base X` becomes `"X..HEAD"`). */
  range: string;
  /** Number of non-merge commits in the range (`git rev-list --no-merges`); `0` for an empty range. */
  commitCount: number;
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
  /**
   * Validate an entire commit range (`--range` / `--base`).
   *
   * Optional — its presence marks the rule as range-scoped. Range-scoped
   * rules are invoked once per range (not per commit), including empty
   * ranges where {@link RangeRuleContext.commitCount | commitCount} is 0.
   * They should make {@link Rule.validate | validate} a no-op returning `[]`
   * so they stay silently inapplicable in single-message modes. A rule may
   * define both functions: in range mode `validate` runs once per commit
   * and `checkRange` once for the whole range.
   */
  checkRange?(context: RangeRuleContext<Options>): RuleProblem[];
}
