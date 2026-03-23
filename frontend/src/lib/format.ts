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
