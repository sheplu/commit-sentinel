/**
 * Isolated Git environment for test fixtures.
 *
 * Prevents user signing configuration, hooks, and global settings
 * from interfering with test Git operations.
 */
export const gitEnv: Record<string, string> = {
  ...process.env as Record<string, string>,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_COUNT: '2',
  GIT_CONFIG_KEY_0: 'commit.gpgsign',
  GIT_CONFIG_VALUE_0: 'false',
  GIT_CONFIG_KEY_1: 'core.hooksPath',
  GIT_CONFIG_VALUE_1: '/dev/null',
};
