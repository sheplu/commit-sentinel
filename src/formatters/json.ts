import type { ValidationReport } from '../runner.ts';
import type { Formatter } from './types.ts';

/** Structured JSON formatter — serializes the full {@link ValidationReport}. */
export const jsonFormatter: Formatter = {
  format(report: ValidationReport): string {
    return JSON.stringify(report, null, 2) + '\n';
  },
};
