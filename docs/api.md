# Programmatic API

```typescript
import { parseCommit, validate, loadConfig } from '@silverwalls-labs/commit-sentinel';

// Parse a commit message
const commit = parseCommit('feat(api)!: drop v1\n\nBREAKING CHANGE: removed /v1');
console.log(commit.type);              // 'feat'
console.log(commit.scope);             // 'api'
console.log(commit.breaking);          // true  (! marker)
console.log(commit.hasBreakingChange); // true  (marker OR footer)

// Validate against a config
const config = await loadConfig();
const report = validate('feat: add login', config);

if (!report.valid) {
  for (const result of report.results) {
    for (const problem of result.problems) {
      console.error(`[${result.ruleName}] ${problem.message}`);
    }
  }
}
```

For ranges, `listCommitsInRange(range)` enumerates the non-merge commit SHAs (`git rev-list --reverse --no-merges`), and `validateRangeRules(range, commitCount, config)` runs the range-scoped rules (those defining `checkRange`, e.g. `max-commits`) and returns a synthetic `ValidationReport` carrying `range` and `kind: "range"` instead of a `sha` — or `null` when nothing fired. It runs on empty ranges too, so a rule can report on a `commitCount` of 0. Combine it with `validate` to reproduce the CLI's `--range` mode:

```typescript
import {
  loadConfig, listCommitsInRange, readCommitMessage, readGitMetaOrNull,
  validate, validateRangeRules,
} from '@silverwalls-labs/commit-sentinel';

const config = await loadConfig();
const shas = await listCommitsInRange('main..HEAD');

const reports = [];
for (const sha of shas) {
  const report = validate(await readCommitMessage(sha), config, await readGitMetaOrNull(sha));
  report.sha = sha;
  reports.push(report);
}
const rangeReport = validateRangeRules('main..HEAD', shas.length, config);
if (rangeReport) reports.push(rangeReport);
```

Also exported: `defineConfig` and `defineRule` for custom configs and rules — see [plugins.md](./plugins.md) for the custom-rule guide — as well as `getPreset`, `builtinRules`, and the `human`, `json`, and `sarif` formatters.
