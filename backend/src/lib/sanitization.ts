/**
 * Input sanitization utilities
 */

/**
 * Sanitize user input for SQL LIKE queries to prevent wildcard injection
 * Escapes % and _ characters which are wildcards in SQL LIKE patterns
 *
 * @example
 * sanitizeLikePattern('100%_fun') → '100\%\_fun'
 */
export function sanitizeLikePattern(input: string): string {
  return input.replace(/[%_]/g, '\\$&');
}
