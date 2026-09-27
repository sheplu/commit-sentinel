#!/usr/bin/env node
import { run } from './cli.ts';

const result = await run(process.argv.slice(2));

if (result.stdout) {
  const ok = process.stdout.write(result.stdout);
  if (!ok) await new Promise<void>((resolve) => process.stdout.once('drain', resolve));
}
if (result.stderr) {
  const ok = process.stderr.write(result.stderr);
  if (!ok) await new Promise<void>((resolve) => process.stderr.once('drain', resolve));
}

process.exitCode = result.exitCode;
