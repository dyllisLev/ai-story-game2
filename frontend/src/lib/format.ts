// lib/format.ts — Shared formatting utilities

/**
 * Format an ISO timestamp string as HH:MM:SS (Korean locale, 24-hour).
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a number with Korean locale thousands separator.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

/**
 * Format large numbers with K suffix (e.g., 1200 → "1.2K")
 */
export function formatCount(n: number | undefined): string {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * Format token counts with K suffix
 */
export function formatTokens(n: number | undefined): string {
  return formatCount(n ?? 0);
}

/**
 * Generate a random short ID for client-side entities
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}


