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

For ranges, `readCommitsInRange(range)` reads every non-merge commit (sha, raw message, git metadata) in a single `git log` spawn, and `validateRangeRules(range, commits, config)` runs the range-scoped rules (those defining `checkRange`, e.g. `max-commits`) against `RangeCommit` objects (`{ sha, commit, git }`) and returns a synthetic `ValidationReport` carrying `range` and `kind: "range"` instead of a `sha` — or `null` when nothing fired. It runs on empty ranges too, so a rule can report on zero commits. Combine it with `validate` to reproduce the CLI's `--range` mode:

```typescript
import {
  loadConfig, readCommitsInRange, validate, validateRangeRules,
} from '@silverwalls-labs/commit-sentinel';

const config = await loadConfig();
const commits = await readCommitsInRange('main..HEAD');

const reports = [];
const rangeCommits = [];
for (const { sha, message, meta } of commits) {
  const report = validate(message, config, meta);
  report.sha = sha;
  reports.push(report);
  rangeCommits.push({ sha, commit: report.commit, git: meta });
}
const rangeReport = validateRangeRules('main..HEAD', rangeCommits, config);
if (rangeReport) reports.push(rangeReport);
```

The per-sha readers (`listCommitsInRange`, `readCommitMessage`, `readGitMetaOrNull`) remain exported for single-commit workflows.

Also exported: `defineConfig` and `defineRule` for custom configs and rules — see [plugins.md](./plugins.md) for the custom-rule guide — as well as `getPreset`, `builtinRules`, and the `human`, `json`, and `sarif` formatters.
