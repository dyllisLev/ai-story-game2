/**
 * Builds a standard paginated response envelope.
 * `data` is the slice of rows already fetched; `count` is the total row count
 * returned by Supabase `{ count: 'exact' }`.
 */
export function buildPaginatedResponse(data, count, page, limit) {
    const total = count ?? 0;
    return {
        data,
        total,
        page,
        limit,
        total_pages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
}
//# sourceMappingURL=pagination.js.map