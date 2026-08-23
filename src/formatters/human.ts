/**
 * Human-readable terminal formatter with optional ANSI color output.
 *
 * Uses `node:util` {@link https://nodejs.org/api/util.html#utilstyletextformat-text | styleText}
 * and respects `NO_COLOR` / `FORCE_COLOR` environment variables.
 *
 * @module
 */
import { styleText } from 'node:util';
import type { ValidationReport } from '../runner.ts';
import type { Formatter, FormatOptions } from './types.ts';

function hasColors(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return process.stdout.isTTY === true;
}

function style(text: string, format: string, color: boolean): string {
  if (!color) return text;
  return styleText(format as Parameters<typeof styleText>[0], text);
}

/** Default terminal formatter with colored icons and suggestions. */
export const humanFormatter: Formatter = {
  format(report: ValidationReport, options?: FormatOptions): string {
    const color = options?.color ?? hasColors();
    const lines: string[] = [];

    if (report.valid && report.warningCount === 0) {
      lines.push(
        style('✔', 'green', color) + ` Valid commit message: ${report.commit.header}`,
      );
      if (report.skippedGitRules.length > 0) {
        lines.push(
          style('ℹ', 'blue', color) +
            ` Skipped git-metadata rules (not available): ${report.skippedGitRules.join(', ')}`,
        );
      }
      return lines.join('\n') + '\n';
    }

    const header = report.commit.header.length > 0 ? report.commit.header : '<empty>';
    if (report.valid) {
      lines.push(style('✔', 'green', color) + ` Valid commit message: ${header}`);
    } else {
      lines.push(style('✖', 'red', color) + ` Invalid commit message: ${header}`);
    }

    lines.push('');

    for (const result of report.results) {
      const icon = result.severity === 'error'
        ? style('✖', 'red', color)
        : style('⚠', 'yellow', color);
      const ruleTag = style(`[${result.ruleName}]`, 'dim', color);

      for (const problem of result.problems) {
        lines.push(`  ${icon} ${problem.message} ${ruleTag}`);
        if (problem.suggestion) {
          lines.push(`    ${style('Suggestion:', 'dim', color)} ${problem.suggestion}`);
        }
      }
    }

    if (report.skippedGitRules.length > 0) {
      lines.push('');
      lines.push(
        style('ℹ', 'blue', color) +
          ` Skipped git-metadata rules (not available): ${report.skippedGitRules.join(', ')}`,
      );
    }

    lines.push('');
    const parts: string[] = [];
    if (report.errorCount > 0) {
      parts.push(style(`${report.errorCount} error(s)`, 'red', color));
    }
    if (report.warningCount > 0) {
      parts.push(style(`${report.warningCount} warning(s)`, 'yellow', color));
    }
    lines.push(parts.join(', '));

    return lines.join('\n') + '\n';
  },
};
