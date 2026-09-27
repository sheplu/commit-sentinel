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

/** Per-file coverage data used for deduplication when merging categories. */
interface FileCoverage {
  lines: Map<number, number>;       // line number → hit count
  branches: Map<number, number>;    // branch number → hit count
  functions: Map<string, number>;   // function name → hit count
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

/**
 * Parse LCOV content into per-file coverage maps for deduplication.
 *
 * When the same source file appears in multiple category LCOV files,
 * we take the max hit count per line/branch/function so that combined
 * coverage is the union — not the sum — across categories.
 */
function parseLcovDetailed(content: string): Map<string, FileCoverage> {
  const files = new Map<string, FileCoverage>();
  let currentFile: FileCoverage | null = null;
  let branchIndex = 0;

  for (const line of content.split('\n')) {
    if (line.startsWith('SF:')) {
      const path = line.slice(3);
      if (!files.has(path)) {
        files.set(path, { lines: new Map(), branches: new Map(), functions: new Map() });
      }
      currentFile = files.get(path)!;
      branchIndex = 0;
    } else if (line === 'end_of_record') {
      currentFile = null;
    } else if (currentFile && line.startsWith('DA:')) {
      const parts = line.slice(3).split(',');
      const lineNum = parseInt(parts[0]!, 10);
      const hits = parseInt(parts[1]!, 10);
      currentFile.lines.set(lineNum, Math.max(currentFile.lines.get(lineNum) ?? 0, hits));
    } else if (currentFile && line.startsWith('BRDA:')) {
      branchIndex++;
      const parts = line.slice(5).split(',');
      const hits = parts[3] === '-' ? 0 : parseInt(parts[3]!, 10);
      currentFile.branches.set(branchIndex, Math.max(currentFile.branches.get(branchIndex) ?? 0, hits));
    } else if (currentFile && line.startsWith('FNDA:')) {
      const parts = line.slice(5).split(',');
      const hits = parseInt(parts[0]!, 10);
      const name = parts.slice(1).join(',');
      currentFile.functions.set(name, Math.max(currentFile.functions.get(name) ?? 0, hits));
    }
  }

  return files;
}

/** Merge per-file coverage maps, taking the max hit count per entry. */
function mergeCoverage(maps: Map<string, FileCoverage>[]): CategoryStats {
  const merged = new Map<string, FileCoverage>();

  for (const fileMap of maps) {
    for (const [path, cov] of fileMap) {
      if (!merged.has(path)) {
        merged.set(path, { lines: new Map(), branches: new Map(), functions: new Map() });
      }
      const target = merged.get(path)!;

      for (const [line, hits] of cov.lines) {
        target.lines.set(line, Math.max(target.lines.get(line) ?? 0, hits));
      }
      for (const [branch, hits] of cov.branches) {
        target.branches.set(branch, Math.max(target.branches.get(branch) ?? 0, hits));
      }
      for (const [fn, hits] of cov.functions) {
        target.functions.set(fn, Math.max(target.functions.get(fn) ?? 0, hits));
      }
    }
  }

  let linesHit = 0, linesFound = 0;
  let branchesHit = 0, branchesFound = 0;
  let functionsHit = 0, functionsFound = 0;

  for (const cov of merged.values()) {
    linesFound += cov.lines.size;
    linesHit += [...cov.lines.values()].filter((h) => h > 0).length;
    branchesFound += cov.branches.size;
    branchesHit += [...cov.branches.values()].filter((h) => h > 0).length;
    functionsFound += cov.functions.size;
    functionsHit += [...cov.functions.values()].filter((h) => h > 0).length;
  }

  return { linesHit, linesFound, branchesHit, branchesFound, functionsHit, functionsFound };
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
  const detailedMaps: Map<string, FileCoverage>[] = [];

  for (const file of lcovFiles) {
    const content = await readFile(join(coverageDir, file), 'utf8');
    const name = file.replace('.lcov', '');
    categories[name] = parseLcov(content);
    detailedMaps.push(parseLcovDetailed(content));
  }

  // Merge coverage across categories by source file, taking the union
  // of covered lines/branches/functions (max hit count per entry).
  const totals = mergeCoverage(detailedMaps);

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
