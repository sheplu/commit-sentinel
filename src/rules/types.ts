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
  /** Validate a commit and return any problems found. */
  validate(context: RuleContext<Options>): RuleProblem[];
}
