#!/usr/bin/env node

/**
 * Merge per-category lcov coverage files into a markdown report.
 *
 * Usage:
 *   node scripts/coverage-report.ts [--out coverage/report.md]
 *
 * Reads coverage/*.lcov files, extracts hit/found counters for lines,
 * branches, and functions, then writes a markdown summary table.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const MARKER = '<!-- commit-sentinel-coverage-report -->';

interface CategoryStats {
  linesHit: number;
  linesFound: number;
  branchesHit: number;
  branchesFound: number;
  functionsHit: number;
  functionsFound: number;
}

function parseLcov(content: string): CategoryStats {
  const stats: CategoryStats = {
    linesHit: 0,
    linesFound: 0,
    branchesHit: 0,
    branchesFound: 0,
    functionsHit: 0,
    functionsFound: 0,
  };

  for (const line of content.split('\n')) {
    if (line.startsWith('LH:')) stats.linesHit += parseInt(line.slice(3), 10);
    if (line.startsWith('LF:')) stats.linesFound += parseInt(line.slice(3), 10);
    if (line.startsWith('BRH:')) stats.branchesHit += parseInt(line.slice(4), 10);
    if (line.startsWith('BRF:')) stats.branchesFound += parseInt(line.slice(4), 10);
    if (line.startsWith('FNH:')) stats.functionsHit += parseInt(line.slice(4), 10);
    if (line.startsWith('FNF:')) stats.functionsFound += parseInt(line.slice(4), 10);
  }

  return stats;
}

function pct(hit: number, found: number): string {
  if (found === 0) return '—';
  return `${((hit / found) * 100).toFixed(1)}%`;
}

async function main() {
  const { values } = parseArgs({
    options: { out: { type: 'string' } },
    strict: false,
    allowPositionals: true,
  });

  const coverageDir = 'coverage';
  const files = await readdir(coverageDir).catch(() => [] as string[]);
  const lcovFiles = files.filter((f) => f.endsWith('.lcov')).sort();

  if (lcovFiles.length === 0) {
    console.error('No .lcov files found in coverage/');
    process.exit(1);
  }

  const categories: Record<string, CategoryStats> = {};
  const totals: CategoryStats = {
    linesHit: 0,
    linesFound: 0,
    branchesHit: 0,
    branchesFound: 0,
    functionsHit: 0,
    functionsFound: 0,
  };

  for (const file of lcovFiles) {
    const content = await readFile(join(coverageDir, file), 'utf8');
    const name = file.replace('.lcov', '');
    const stats = parseLcov(content);
    categories[name] = stats;
    totals.linesHit += stats.linesHit;
    totals.linesFound += stats.linesFound;
    totals.branchesHit += stats.branchesHit;
    totals.branchesFound += stats.branchesFound;
    totals.functionsHit += stats.functionsHit;
    totals.functionsFound += stats.functionsFound;
  }

  const lines: string[] = [
    MARKER,
    '## 📊 Coverage Report',
    '',
    '| Category | Lines | Branches | Functions |',
    '|----------|-------|----------|-----------|',
  ];

  for (const [name, stats] of Object.entries(categories)) {
    lines.push(
      `| ${name} | ${pct(stats.linesHit, stats.linesFound)} | ${pct(stats.branchesHit, stats.branchesFound)} | ${pct(stats.functionsHit, stats.functionsFound)} |`,
    );
  }

  lines.push(
    `| **Total** | **${pct(totals.linesHit, totals.linesFound)}** | **${pct(totals.branchesHit, totals.branchesFound)}** | **${pct(totals.functionsHit, totals.functionsFound)}** |`,
  );
  lines.push('');

  const report = lines.join('\n');

  if (values.out) {
    await writeFile(values.out as string, report, 'utf8');
    console.log(`Coverage report written to ${values.out}`);
  } else {
    process.stdout.write(report);
  }
}

main();
