// backend/src/routes/admin/api-logs.ts
// GET    /api/admin/api-logs        — paginated list with filters
// GET    /api/admin/api-logs/stats  — today's aggregate stats
// GET    /api/admin/api-logs/:id    — single log detail
// DELETE /api/admin/api-logs        — delete all (danger zone)
import type { FastifyInstance } from 'fastify';
import type {
  ApiLog,
  ApiLogFilter,
  ApiLogStats,
  PaginatedResponse,
} from '@story-game/shared';
import { requireAdmin } from '../../plugins/auth.js';
import { buildPaginatedResponse } from '../../lib/pagination.js';

export default async function adminApiLogsRoute(app: FastifyInstance) {
  // GET /api/admin/api-logs/stats — must come before /:id route
  app.get('/api/admin/api-logs/stats', async (request, reply) => {
    requireAdmin(request);

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    ).toISOString();

    const [{ count: total_calls_today }, { data: tokensData }, { count: error_count_today }] =
      await Promise.all([
        app.supabaseAdmin
          .from('api_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart),
        app.supabaseAdmin
          .from('api_logs')
          .select('response_usage')
          .gte('created_at', todayStart)
          .not('response_usage', 'is', null),
        app.supabaseAdmin
          .from('api_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart)
          .not('response_error', 'is', null),
      ]);

    const totalTokens = ((tokensData as { response_usage: { input: number; output: number } }[]) ?? [])
      .reduce(
        (acc, row) => ({
          input:  acc.input  + (row.response_usage?.input  ?? 0),
          output: acc.output + (row.response_usage?.output ?? 0),
        }),
        { input: 0, output: 0 }
      );

    const response: ApiLogStats = {
      total_calls_today: total_calls_today ?? 0,
      total_tokens_today: totalTokens,
      error_count_today: error_count_today ?? 0,
    };

    return reply.send(response);
  });

  // GET /api/admin/api-logs — paginated list
  app.get('/api/admin/api-logs', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          endpoint:    { type: 'string' },
          session_id:  { type: 'string' },
          from:        { type: 'string' },
          to:          { type: 'string' },
          errors_only: { type: 'boolean' },
          page:        { type: 'integer', minimum: 1, default: 1 },
          limit:       { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    requireAdmin(request);

    const f = request.query as ApiLogFilter;
    const pageNum = Number(f.page ?? 1);
    const limitNum = Math.min(Number(f.limit ?? 50), 200);
    const offset = (pageNum - 1) * limitNum;

    let query = app.supabaseAdmin
      .from('api_logs')
      .select(
        'id, session_id, endpoint, request_model, response_usage, response_error, duration_ms, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (f.endpoint) {
      query = query.eq('endpoint', f.endpoint);
    }
    if (f.session_id) {
      query = query.eq('session_id', f.session_id);
    }
    if (f.from) {
      query = query.gte('created_at', f.from);
    }
    if (f.to) {
      query = query.lte('created_at', f.to);
    }
    if (f.errors_only === true) {
      query = query.not('response_error', 'is', null);
    }

    const { data, count, error } = await query;
    if (error) {
      app.log.error(error, 'adminApiLogsRoute GET: query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 로그를 불러오는데 실패했습니다' },
      });
    }

    return reply.send(buildPaginatedResponse<Partial<ApiLog>>((data as Partial<ApiLog>[]) ?? [], count, pageNum, limitNum));
  });

  // GET /api/admin/api-logs/:id — full detail (includes prompts, messages, response)
  app.get('/api/admin/api-logs/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };

    const { data, error } = await app.supabaseAdmin
      .from('api_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'API 로그를 찾을 수 없습니다' },
      });
    }

    return reply.send(data as ApiLog);
  });

  // DELETE /api/admin/api-logs — delete all (danger zone)
  app.delete('/api/admin/api-logs', async (request, reply) => {
    requireAdmin(request);

    const { error } = await app.supabaseAdmin
      .from('api_logs')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      app.log.error(error, 'adminApiLogsRoute DELETE: delete failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'API 로그 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
