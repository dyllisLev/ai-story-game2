// backend/src/routes/admin/service-logs.ts
// GET    /api/admin/service-logs        — paginated list with filters
// GET    /api/admin/service-logs/stats  — aggregate stats
// DELETE /api/admin/service-logs        — delete all (danger zone)
import type { FastifyInstance } from 'fastify';
import type {
  ServiceLog,
  ServiceLogFilter,
  ServiceLogStats,
  PaginatedResponse,
} from '@story-game/shared';
import { requireAdmin, requireAdminWithBasicAuth } from '../../plugins/auth.js';
import { buildPaginatedResponse } from '../../lib/pagination.js';

export default async function adminServiceLogsRoute(app: FastifyInstance) {
  // GET /api/admin/service-logs/stats — must come before :id-style routes
  app.get('/admin/service-logs/stats', async (request, reply) => {
    requireAdmin(request);

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    ).toISOString();
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Run all aggregate queries in parallel.
    // avg_response_ms: computed via Postgres AVG through an RPC.
    // hourly_counts: computed via Postgres date_part grouping through an RPC.
    const [
      { count: totalCount },
      { count: errorCount },
      { count: total_requests_today },
      { data: avgData },
      { data: hourlyData },
    ] = await Promise.all([
      // total requests in last 24h
      app.supabaseAdmin
        .from('service_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', twentyFourHoursAgo),
      // error requests in last 24h
      app.supabaseAdmin
        .from('service_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', twentyFourHoursAgo)
        .gte('status_code', 400),
      // total requests today
      app.supabaseAdmin
        .from('service_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', todayStart),
      // avg duration via RPC (avoids fetching all rows)
      app.supabaseAdmin
        .rpc('get_avg_service_log_duration', { since: twentyFourHoursAgo }),
      // hourly counts via RPC (avoids fetching all timestamps)
      app.supabaseAdmin
        .rpc('get_service_log_hourly_counts', { since: todayStart }),
    ]);

    const error_rate_24h =
      totalCount && totalCount > 0
        ? Math.round(((errorCount ?? 0) / totalCount) * 10000) / 100
        : 0;

    const avg_response_ms = Math.round((avgData as number | null) ?? 0);

    // Build 24-slot array from the RPC result (array of {hour, count})
    const hourlyCounts: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyCounts[h] = 0;
    ((hourlyData as { hour: number; count: number }[]) ?? []).forEach(
      ({ hour, count }) => { hourlyCounts[hour] = count; }
    );

    const response: ServiceLogStats = {
      error_rate_24h,
      avg_response_ms,
      total_requests_today: total_requests_today ?? 0,
      hourly_counts: Object.entries(hourlyCounts).map(([hour, count]) => ({
        hour: Number(hour),
        count,
      })),
    };

    return reply.send(response);
  });

  // GET /api/admin/service-logs — paginated list
  app.get('/admin/service-logs', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status:      { type: 'string' },  // '2xx', '4xx', '5xx', ''
          status_code: { type: 'integer' }, // legacy: specific status code
          path:        { type: 'string' },
          time_range:  { type: 'string' },  // '1h', '6h', '24h', '7d'
          from:        { type: 'string' },  // ISO 8601 timestamp
          to:          { type: 'string' },  // ISO 8601 timestamp
          page:        { type: 'integer', minimum: 1, default: 1 },
          limit:       { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    requireAdmin(request);

    const f = request.query as ServiceLogFilter & { status?: string; time_range?: string };
    const pageNum = Number(f.page ?? 1);
    const limitNum = Math.min(Number(f.limit ?? 50), 200);
    const offset = (pageNum - 1) * limitNum;

    // Handle time_range parameter (convert to from/to dates)
    let from: string | undefined = f.from;
    let to: string | undefined = f.to;

    if (f.time_range && !from) {
      const now = new Date();
      let timeRangeMs: number;

      switch (f.time_range) {
        case '1h':
          timeRangeMs = 1 * 60 * 60 * 1000;
          break;
        case '6h':
          timeRangeMs = 6 * 60 * 60 * 1000;
          break;
        case '24h':
          timeRangeMs = 24 * 60 * 60 * 1000;
          break;
        case '7d':
          timeRangeMs = 7 * 24 * 60 * 60 * 1000;
          break;
        default:
          timeRangeMs = 24 * 60 * 60 * 1000; // default to 24h
      }

      from = new Date(now.getTime() - timeRangeMs).toISOString();
    }

    // Handle status parameter (convert 2xx/4xx/5xx to status_code ranges)
    let useStatusCodeFilter = false;
    let minStatus = 0;
    let maxStatus = 999;

    if (f.status_code) {
      // Legacy: direct status code filter
      useStatusCodeFilter = true;
      minStatus = Number(f.status_code);
      maxStatus = Number(f.status_code);
    } else if (f.status) {
      // New: 2xx/4xx/5xx filter
      useStatusCodeFilter = true;
      switch (f.status) {
        case '2xx':
          minStatus = 200;
          maxStatus = 299;
          break;
        case '4xx':
          minStatus = 400;
          maxStatus = 499;
          break;
        case '5xx':
          minStatus = 500;
          maxStatus = 599;
          break;
        default:
          useStatusCodeFilter = false; // '' means all status codes
      }
    }

    let query = app.supabaseAdmin
      .from('service_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Apply status code filter using gte/lte for ranges
    if (useStatusCodeFilter) {
      query = query.gte('status_code', minStatus).lte('status_code', maxStatus);
    }

    if (f.path) {
      query = query.ilike('path', `%${f.path}%`);
    }
    if (from) {
      query = query.gte('timestamp', from);
    }
    if (to) {
      query = query.lte('timestamp', to);
    }

    const { data, count, error } = await query;
    if (error) {
      app.log.error(error, 'adminServiceLogsRoute GET: query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '서비스 로그를 불러오는데 실패했습니다' },
      });
    }

    return reply.send(
      buildPaginatedResponse<ServiceLog>((data as ServiceLog[]) ?? [], count, pageNum, limitNum)
    );
  });

  // DELETE /api/admin/service-logs — delete all (danger zone)
  app.delete('/admin/service-logs', async (request, reply) => {
    requireAdminWithBasicAuth(request);

    // Delete all rows — Supabase requires a filter; use gte on a timestamp
    const { error } = await app.supabaseAdmin
      .from('service_logs')
      .delete()
      .gte('timestamp', '1970-01-01T00:00:00Z');

    if (error) {
      app.log.error(error, 'adminServiceLogsRoute DELETE: delete failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '서비스 로그 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
