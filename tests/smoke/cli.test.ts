import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { run } from '../../src/cli.ts';

describe('CLI run()', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'commit-sentinel-cli-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('prints help and exits 0', async () => {
    const result = await run(['--help']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Usage: commit-sentinel/);
  });

  it('prints version and exits 0', async () => {
    const result = await run(['--version']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /0\.1\.0/);
  });

  it('exits 1 for unknown flags', async () => {
    const result = await run(['--bad-flag']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Unknown/i);
  });

  it('exits 0 for valid message', async () => {
    const result = await run(['--message', 'chore: bootstrap project']);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('accepts revert type with the conventional preset', async () => {
    const configPath = join(dir, 'conventional.config.ts');
    await writeFile(configPath, `export default { extends: 'conventional' };`);

    const result = await run(['--message', 'revert: undo the login change', '--config', configPath]);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('hardened preset rejects a scope-less, body-less message', async () => {
    const configPath = join(dir, 'hardened.config.ts');
    await writeFile(configPath, `export default { extends: 'hardened' };`);

    const result = await run(['--message', 'feat: add login', '--config', configPath]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /scope-required/);
    assert.match(result.stderr, /body-required/);
  });

  it('hardened preset accepts a fully compliant message', async () => {
    const configPath = join(dir, 'hardened.config.ts');
    await writeFile(configPath, `export default { extends: 'hardened' };`);

    const message = 'feat(api): add login\n\nAdd the login flow with session handling.';
    const result = await run(['--message', message, '--config', configPath]);
    assert.equal(result.exitCode, 0);
  });

  it('rejects revert type in the strict preset', async () => {
    const configPath = join(dir, 'strict.config.ts');
    await writeFile(configPath, `export default { extends: 'strict' };`);

    const result = await run(['--message', 'revert: undo the login change', '--config', configPath]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Unsupported commit type "revert"/);
  });

  it('exits 2 for invalid message', async () => {
    const result = await run(['--message', 'bad message']);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Invalid commit message/);
  });

  it('reads from a file', async () => {
    const messageFile = join(dir, 'message.txt');
    await writeFile(messageFile, 'fix: handle edge case\n', 'utf8');

    const result = await run(['--file', messageFile]);
    assert.equal(result.exitCode, 0);
  });

  it('rejects multiple sources', async () => {
    const result = await run(['--message', 'feat: x', '--stdin']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Choose only one/);
  });

  it('rejects combining --json and --sarif', async () => {
    const result = await run(['--message', 'feat: add login', '--json', '--sarif']);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Cannot use both/);
  });

  it('outputs JSON with --json flag', async () => {
    const result = await run(['--message', 'feat: add login', '--json']);
    assert.equal(result.exitCode, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.valid, true);
  });

  it('outputs SARIF with --sarif flag', async () => {
    const result = await run(['--message', 'feat: add login', '--sarif']);
    assert.equal(result.exitCode, 0);
    const sarif = JSON.parse(result.stdout);
    assert.equal(sarif.version, '2.1.0');
  });

  it('exits 1 when file does not exist', async () => {
    const result = await run(['--file', join(dir, 'nonexistent.txt')]);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.length > 0);
  });

  it('validates a range of commits', async () => {
    const result = await run(['--range', 'HEAD~1..HEAD']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    // Output should contain commit validation info
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  it('validates using --base shorthand', async () => {
    const result = await run(['--base', 'HEAD~1']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    assert.ok(result.stdout.length > 0 || result.stderr.length > 0);
  });

  it('reports no commits for empty range', async () => {
    const result = await run(['--range', 'HEAD..HEAD']);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /No commits found/);
  });

  it('validates JSON output for range is a valid array', async () => {
    const result = await run(['--range', 'HEAD~1..HEAD', '--json']);
    assert.ok(result.exitCode === 0 || result.exitCode === 2);
    const output = result.stdout || result.stderr;
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed));
  });

  describe('custom rules via plugins', () => {
    const pluginConfig = `
      export default {
        extends: 'strict',
        plugins: [{
          meta: {
            name: 'no-wip',
            description: 'Subject must not start with WIP',
            category: 'content',
            requiresGit: false,
            defaultSeverity: 'error',
          },
          validate({ commit }) {
            if (commit.subject?.toUpperCase().startsWith('WIP')) {
              return [{ message: 'WIP commits are not allowed.' }];
            }
            return [];
          },
        }],
      };
    `;

    it('exits 2 when a plugin rule fails', async () => {
      const configPath = join(dir, 'plugin.config.ts');
      await writeFile(configPath, pluginConfig);

      const result = await run(['--message', 'feat: WIP do not merge', '--config', configPath]);
      assert.equal(result.exitCode, 2);
      assert.match(result.stderr, /no-wip/);
      assert.match(result.stderr, /WIP commits are not allowed/);
    });

    it('exits 0 when a plugin rule passes', async () => {
      const configPath = join(dir, 'plugin.config.ts');
      await writeFile(configPath, pluginConfig);

      const result = await run(['--message', 'feat: add login', '--config', configPath]);
      assert.equal(result.exitCode, 0);
    });

    it('exits 1 when a plugin collides with a builtin rule', async () => {
      const configPath = join(dir, 'collision.config.ts');
      await writeFile(configPath, `
        export default {
          plugins: [{
            meta: {
              name: 'format',
              description: 'shadow builtin',
              category: 'format',
              requiresGit: false,
              defaultSeverity: 'error',
            },
            validate() { return []; },
          }],
        };
      `);

      const result = await run(['--message', 'feat: add login', '--config', configPath]);
      assert.equal(result.exitCode, 1);
      assert.match(result.stderr, /conflicts with a built-in rule/);
    });
  });
});
