/** Valid commit messages by variant. */
export const valid = {
  simple: 'feat: add login',
  withScope: 'fix(api): handle timeout',
  chore: 'chore: update tooling',
  withBody: 'feat: add login\n\nThis implements the user login feature.',
  withFooter: 'feat: add login\n\nBody text.\n\nReviewed-by: Alice',
  withBreakingMarker: 'feat!: drop legacy API',
  withBreakingFooter: 'feat: change\n\nBREAKING CHANGE: removed /v1 endpoint',
  withScopeAndBreaking: 'refactor(core)!: rewrite internals',
  withMultipleFooters: 'fix: bug\n\nBody.\n\nReviewed-by: Alice\nRefs #123',
} as const;

/** Invalid commit messages by failure mode. */
export const invalid = {
  noColon: 'fix bug',
  empty: '',
  whitespaceOnly: '   ',
  missingSubject: 'feat: ',
  unsupportedType: 'docs: update readme',
} as const;

/** Edge-case commit messages. */
export const edge = {
  longSubject: `feat: ${'a'.repeat(200)}`,
  uppercaseSubject: 'feat: Add Login',
  multilineBody: 'feat: add\n\nLine 1.\n\nLine 2.\n\nLine 3.',
  longBodyLine: `feat: add\n\n${'a'.repeat(150)}`,
  breakingDashFooter: 'feat: change\n\nBREAKING-CHANGE: new behavior',
  footerContinuation: 'fix: bug\n\nBREAKING CHANGE: first line\ncontinuation line',
  nonAlphaSubjectStart: 'feat: 123 numbers first',
} as const;
