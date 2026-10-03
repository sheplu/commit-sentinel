import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * `file://` URL of the package entry point, for temp-dir config files that
 * need to `import { defineRule }` from the source tree.
 */
export const INDEX_URL = pathToFileURL(
  resolve(import.meta.dirname, '..', '..', 'src', 'index.ts'),
).href;
