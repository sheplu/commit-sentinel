# commit-sentinel

A CLI tool to validate git commit message formats.

## Features

- Validates Conventional Commit-style subjects: `type: subject` or `type(scope): subject`
- Starts with a strict type allowlist: `feat`, `fix`, and `chore`
- Reads commit messages from a string, file, stdin, or a git commit ref
- Returns CI-friendly exit codes and actionable error messages

## Installation

```bash
npm install -g @sheplu/commit-sentinel
```

## Usage

```bash
# Validate the last commit
commit-sentinel

# Validate a commit message string
commit-sentinel --message "feat: add login"

# Validate a commit message file, e.g. from a commit-msg hook
commit-sentinel --file .git/COMMIT_EDITMSG

# Validate a specific commit
commit-sentinel --commit HEAD~1

# Read a commit message from stdin
echo "fix(api): handle timeout" | commit-sentinel --stdin
```

Valid messages:

```text
feat: add user login
fix(api): handle request timeout
chore: update tooling
```

Invalid messages:

```text
docs: update readme
fix missing colon
feat:
```

## Exit Codes

- `0` - Commit message is valid
- `1` - CLI usage or runtime error
- `2` - Commit message validation failed

## Git Hooks Integration

### Using with Husky

```bash
npm install --save-dev husky
npx husky init
echo "commit-sentinel --file \$1" > .husky/commit-msg
```

### Using with lefthook

```yaml
# lefthook.yml
commit-msg:
  commands:
    validate:
      run: commit-sentinel --file {1}
```

## CI/CD Integration

```yaml
name: Validate Commit
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
      - run: commit-sentinel --commit HEAD
```

## API

```typescript
import { validateCommit } from '@sheplu/commit-sentinel';

const result = validateCommit('feat(api): add user endpoint');

if (!result.valid) {
  console.error(result.errors);
}
```
