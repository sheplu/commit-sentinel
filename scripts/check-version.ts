#!/usr/bin/env node

/**
 * Verify that src/version.ts matches the version in package.json.
 * Run as part of CI or the build step to prevent drift.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const versionModule = await readFile(resolve(root, 'src/version.ts'), 'utf8');

const match = /VERSION\s*=\s*'([^']+)'/.exec(versionModule);
if (!match) {
  console.error('Could not parse VERSION from src/version.ts');
  process.exit(1);
}

const srcVersion = match[1];
const pkgVersion = pkg.version;

if (srcVersion !== pkgVersion) {
  console.error(
    `Version mismatch: src/version.ts has "${srcVersion}" but package.json has "${pkgVersion}"`,
  );
  process.exit(1);
}

console.log(`✔ Version ${pkgVersion} is consistent`);
