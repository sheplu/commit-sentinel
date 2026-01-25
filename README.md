# commit-sentinel

A CLI tool to enforce commit message conventions and PR hygiene across your projects.

## Features

### Commit Message Validation

- **Conventional Commits** - Enforce the `type(scope): description` format
- **Type Whitelist** - Restrict commits to allowed types (feat, fix, docs, chore, refactor, test, ci, etc.)
- **Scope Validation** - Optional or required scopes with regex pattern matching
- **Subject Line Rules** - Max length, case enforcement, no trailing period, imperative mood
- **Body Rules** - Require blank line after subject, enforce line wrap limits
- **Footer Validation** - Issue references, breaking change markers, sign-off requirements

### PR and Branch Rules

- **Max Commits per PR** - Enforce squashing or limit commit count
- **Branch Naming** - Regex patterns for branch names (e.g., `feature/JIRA-123-description`)
- **Linear History** - Detect merge commits, enforce rebased history

### Developer Experience

- Clear error messages with fix suggestions
- Interactive commit message builder
- Dry-run mode for validation without blocking
- Configurable severity levels (error, warning, ignore)

## Installation

```bash
npm install -g @sheplu/commit-sentinel
```

## Usage

```bash
# Validate the last commit
@sheplu/commit-sentinel

# Validate a specific commit
@sheplu/commit-sentinel --commit <sha>

# Validate all commits in a PR/branch
@sheplu/commit-sentinel --range main..HEAD

# Validate branch name
@sheplu/commit-sentinel --branch

# Interactive commit message builder
@sheplu/commit-sentinel --interactive

# Dry-run mode
@sheplu/commit-sentinel --dry-run
```

## Configuration

Create a `commit-sentinel.config.json` file in your project root:

```json
{
  "extends": "default",
  "rules": {
    "type": {
      "level": "error",
      "allowed": ["feat", "fix", "docs", "chore", "refactor", "test", "ci", "perf", "style"]
    },
    "scope": {
      "level": "error",
      "required": false,
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "subject": {
      "level": "error",
      "maxLength": 72,
      "minLength": 10,
      "case": "lower",
      "noPeriod": true
    },
    "body": {
      "level": "warning",
      "required": false,
      "maxLineLength": 100
    },
    "footer": {
      "level": "warning",
      "requireIssueRef": false,
      "issuePattern": "^(closes|fixes|resolves) #[0-9]+$"
    },
    "pr": {
      "level": "error",
      "maxCommits": 10
    },
    "branch": {
      "level": "error",
      "pattern": "^(main|develop|(feature|fix|hotfix|release)/[A-Z]+-[0-9]+-[a-z0-9-]+)$"
    }
  }
}
```

### Config File Formats

Configuration is resolved in the following order (first match wins):

1. `"commit-sentinel"` field in `package.json` (recommended)
2. `commit-sentinel.config.ts`
3. `commit-sentinel.config.js`
4. `commit-sentinel.config.json`

#### Using package.json (recommended)

Add a `"commit-sentinel"` field to your `package.json` to avoid config file sprawl:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "commit-sentinel": {
    "extends": "default",
    "rules": {
      "type": {
        "allowed": ["feat", "fix", "docs", "chore"]
      },
      "subject": {
        "maxLength": 72
      }
    }
  }
}
```

#### Using TypeScript config

For dynamic configurations, use `commit-sentinel.config.ts`:

```typescript
import type { Config } from '@sheplu/commit-sentinel';

export default {
  extends: 'default',
  rules: {
    type: {
      allowed: ['feat', 'fix', 'docs', 'chore'],
    },
    scope: {
      pattern: `^(${['api', 'web', 'cli', 'core'].join('|')})$`,
    },
  },
} satisfies Config;
```

### Rule Levels

- `error` - Validation fails, non-zero exit code
- `warning` - Prints warning but passes validation
- `ignore` - Rule is disabled

### Extending Configurations

```json
{
  "extends": ["default", "./custom-rules.json", "@company/commit-rules"]
}
```

## Git Hooks Integration

### Using with Husky

```bash
npm install --save-dev husky
npx husky init
echo "commit-sentinel --commit \$1" > .husky/commit-msg
```

### Using with lefthook

```yaml
# lefthook.yml
commit-msg:
  commands:
    validate:
      run: commit-sentinel --commit {1}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Commits
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
      - run: npm install -g @sheplu/commit-sentinel
      - run: commit-sentinel --range origin/main..HEAD
```

### GitLab CI

```yaml
validate-commits:
  image: node:24
  script:
    - npm install -g @sheplu/commit-sentinel
    - @sheplu/commit-sentinel --range origin/main..HEAD
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## API

```typescript
import { validate, validateCommit, validateBranch } from 'commit-sentinel';

// Validate a commit message
const result = validateCommit('feat(api): add user endpoint');

if (!result.valid) {
  console.error(result.errors);
}

// Validate with custom config
const result = validate({
  message: 'feat: add feature',
  config: {
    rules: {
      scope: { required: true }
    }
  }
});
```
