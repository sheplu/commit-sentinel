import type { RangeCommit, Rule } from '../../src/rules/types.ts';
import { parseCommit } from '../../src/parser.ts';

/** Range-scoped plugin rule shared by unit and smoke tests. */
export const minCommitsRule: Rule = {
  meta: {
    name: 'min-commits',
    description: 'Range must contain at least one commit',
    category: 'git',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate: () => [],
  checkRange: ({ range, commitCount }) =>
    commitCount >= 1 ? [] : [{ message: `Range ${range} must contain at least one commit.` }],
};

/** Build `count` synthetic range commits (oldest first) for checkRange tests. */
export function fakeCommits(count: number): RangeCommit[] {
  return Array.from({ length: count }, (_, i) => ({
    sha: (i + 1).toString(16).padStart(40, '0'),
    commit: parseCommit(`chore: change ${i + 1}`),
    git: null,
  }));
}

/** Source of a config file registering {@link minCommitsRule} as a plugin. */
export function minCommitsConfigSource(indexUrl: string): string {
  return `import { defineRule } from '${indexUrl}';

const minCommitsRule = defineRule({
  meta: {
    name: 'min-commits',
    description: 'Range must contain at least one commit',
    category: 'git',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate() { return []; },
  checkRange({ range, commitCount }) {
    if (commitCount >= 1) return [];
    return [{ message: 'Range ' + range + ' must contain at least one commit.' }];
  },
});

export default { extends: 'strict', plugins: [minCommitsRule] };`;
}

/**
 * Source of a config file with a plugin whose `checkRange` reports what it
 * received — proves the CLI threads per-commit data (sha, parsed commit, git
 * metadata) through to range-scoped rules.
 */
export function commitsProbeConfigSource(indexUrl: string): string {
  return `import { defineRule } from '${indexUrl}';

const commitsProbeRule = defineRule({
  meta: {
    name: 'commits-probe',
    description: 'Reports the commits received by checkRange',
    category: 'git',
    requiresGit: false,
    defaultSeverity: 'error',
  },
  validate() { return []; },
  checkRange({ commits, commitCount }) {
    if (commits.length === 0) return [];
    const first = commits[0];
    return [{
      message: 'probe: count=' + commitCount + '/' + commits.length +
        ' sha=' + first.sha.slice(0, 7) +
        ' type=' + first.commit.type +
        ' email=' + (first.git === null ? 'none' : first.git.authorEmail),
    }];
  },
});

export default { extends: 'strict', plugins: [commitsProbeRule] };`;
}
