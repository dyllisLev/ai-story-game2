/**
 * Parses AI responses that contain a status block at the end.
 *
 * Expected format:
 * ```
 * (story narrative text)
 *
 * ```status
 * 경지: 통맥 3단계
 * 내공: 78/100
 * ```
 * ```
 */

export interface ParsedResponse {
  content: string;
  statusValues: Record<string, string> | null;
}

export interface BarValue {
  current: number;
  max: number;
}

/**
 * Extracts and parses a ```status ... ``` block from the end of an AI response.
 * Returns the cleaned narrative content and parsed key-value pairs.
 */
export function parseStatusBlock(rawText: string): ParsedResponse {
  // Match a ```status block — allow optional closing backticks at end of string
  // We look for the LAST occurrence to handle multiple code blocks in the narrative
  const statusBlockRegex = /```status\s*\n([\s\S]*?)(?:```|$)/g;

  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = statusBlockRegex.exec(rawText)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) {
    return { content: rawText, statusValues: null };
  }

  const blockStart = lastMatch.index;
  const blockEnd = lastMatch.index + lastMatch[0].length;

  // Only treat it as a status block if it appears near the end of the text
  // (allow up to 10 characters of trailing whitespace/newlines after the block)
  const trailing = rawText.slice(blockEnd).trim();
  if (trailing.length > 0) {
    // There is meaningful text after the status block — not a trailing block, ignore
    return { content: rawText, statusValues: null };
  }

  const blockBody = lastMatch[1];
  const content = rawText.slice(0, blockStart).trimEnd();
  const statusValues = parseStatusLines(blockBody);

  return { content, statusValues };
}

/**
 * Parses lines of the form "name: value" into a key-value record.
 * Blank lines and malformed lines are skipped.
 */
function parseStatusLines(body: string): Record<string, string> | null {
  const lines = body.split('\n');
  const result: Record<string, string> = {};
  let parsed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key) {
      result[key] = value;
      parsed = true;
    }
  }

  return parsed ? result : null;
}

/**
 * Parses a "current/max" formatted string (e.g. "78/100") into numeric parts.
 * Returns null if the value does not match this format.
 */
export function parseBarValue(value: string): BarValue | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!match) return null;

  const current = parseFloat(match[1]);
  const max = parseFloat(match[2]);

  if (isNaN(current) || isNaN(max) || max === 0) return null;

  return { current, max };
}
