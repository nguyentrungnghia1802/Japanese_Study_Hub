import * as sanitizeHtmlModule from 'sanitize-html';

type SanitizeHtml = typeof import('sanitize-html');

// TypeScript CommonJS and Vite's ESM transform expose `export =` packages
// differently. Resolve both shapes once at the trust boundary and keep the
// call sites independent of the module-loader implementation.
const sanitizeHtml: SanitizeHtml =
  typeof sanitizeHtmlModule === 'function'
    ? (sanitizeHtmlModule as unknown as SanitizeHtml)
    : ((sanitizeHtmlModule as unknown as { default?: SanitizeHtml }).default ??
      (sanitizeHtmlModule as unknown as SanitizeHtml));

export function sanitizeProviderHtml(
  value: string,
  options?: Parameters<SanitizeHtml>[1],
): string {
  return sanitizeHtml(value, options);
}
