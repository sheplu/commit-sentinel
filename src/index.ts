// Parser
export { parseCommit } from './parser.ts';

// Config
export { defineConfig } from './config/define-config.ts';
export { loadConfig } from './config/loader.ts';
export { getPreset } from './config/presets.ts';

// Rules
export { defineRule } from './rules/define-rule.ts';
export { builtinRules, getRule } from './rules/registry.ts';

// Runner
export { validate } from './runner.ts';

// Formatters
export { humanFormatter } from './formatters/human.ts';
export { jsonFormatter } from './formatters/json.ts';
export { sarifFormatter } from './formatters/sarif.ts';

// Types
export type {
  ParsedCommit,
  Footer,
  GitMeta,
  Rule,
  RuleMeta,
  RuleContext,
  RuleProblem,
  RuleConfig,
  RuleCategory,
  Severity,
  ActiveSeverity,
  UserConfig,
  Preset,
  ResolvedConfig,
  ResolvedRuleEntry,
  ValidationReport,
  RuleResult,
  Formatter,
  FormatOptions,
} from './types.ts';
