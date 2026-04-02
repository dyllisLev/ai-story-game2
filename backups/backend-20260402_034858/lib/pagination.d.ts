import type { PaginatedResponse } from '@story-game/shared';
/**
 * Builds a standard paginated response envelope.
 * `data` is the slice of rows already fetched; `count` is the total row count
 * returned by Supabase `{ count: 'exact' }`.
 */
export declare function buildPaginatedResponse<T>(data: T[], count: number | null, page: number, limit: number): PaginatedResponse<T>;
