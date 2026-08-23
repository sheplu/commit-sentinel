#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './src/cli.ts';

export {
  parseCommit,
  defineConfig,
  defineRule,
  loadConfig,
  getPreset,
  validate,
  builtinRules,
  getRule,
  humanFormatter,
  jsonFormatter,
  sarifFormatter,
} from './src/index.ts';

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
} from './src/types.ts';

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await run(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}
