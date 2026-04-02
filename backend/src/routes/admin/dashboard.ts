// backend/src/routes/admin/dashboard.ts
// GET /api/admin/dashboard — aggregate stats for admin overview
import type { FastifyInstance } from 'fastify';
import type { ApiLog } from '@story-game/shared';
import { requireAdmin, requireAdminWithBasicAuth } from '../../plugins/auth.js';

interface DashboardResponse {
  stories: {
    total: number;
    public: number;
    featured: number;
  };
  sessions: {
    total: number;
    active_today: number;
  };
  users: {
    total: number;
  };
  system: {
    error_rate_24h: number;
    avg_response_ms: number;
    total_requests_today: number;  // Gemini API calls only
  };
  recent_events: Partial<ApiLog>[];
  hourly_calls: { hour: number; count: number }[];
}

export default async function adminDashboardRoute(app: FastifyInstance) {
  app.get('/admin/dashboard', async (request, reply) => {
    requireAdmin(request);

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    ).toISOString();
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Only count Gemini API calls (game/chat, game/test-prompt)
    const geminiEndpoints = ['/api/game/chat', '/api/game/test-prompt'];

    // Run all queries in parallel — avg duration delegated to DB via RPC
    const [
      { count: totalStories },
      { count: publicStories },
      { count: featuredStories },
      { count: totalSessions },
      { count: activeSessions },
      { count: totalUsers },
      { count: reqTotal24h },
      { count: reqErrors24h },
      { data: avgDurationData },
      { count: geminiCallsToday },
      { data: recentEvents },
      { data: hourlyCallsData },
    ] = await Promise.all([
      app.supabaseAdmin
        .from('stories')
        .select('*', { count: 'exact', head: true }),
      app.supabaseAdmin
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true),
      app.supabaseAdmin
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('is_featured', true),
      app.supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true }),
      app.supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_played_at', todayStart),
      app.supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true }),
      app.supabaseAdmin
        .from('service_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', twentyFourHoursAgo),
      app.supabaseAdmin
        .from('service_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', twentyFourHoursAgo)
        .gte('status_code', 400),
      // avg duration delegated to DB — avoids fetching all rows
      app.supabaseAdmin
        .rpc('get_avg_service_log_duration', { since: twentyFourHoursAgo }),
      // Gemini API calls only (from api_logs table, filtered by endpoint)
      app.supabaseAdmin
        .from('api_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .in('endpoint', geminiEndpoints),
      app.supabaseAdmin
        .from('api_logs')
        .select('id, session_id, endpoint, request_model, response_usage, response_error, duration_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      // Hourly Gemini API calls for the chart (last 24 hours)
      app.supabaseAdmin
        .from('api_logs')
        .select('created_at')
        .gte('created_at', twentyFourHoursAgo)
        .in('endpoint', geminiEndpoints),
    ]);

    const error_rate_24h =
      reqTotal24h && reqTotal24h > 0
        ? Math.round(((reqErrors24h ?? 0) / reqTotal24h) * 10000) / 100
        : 0;

    const avg_response_ms = Math.round((avgDurationData as number | null) ?? 0);

    // Calculate hourly API calls for the chart
    const hourlyCallsMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourlyCallsMap.set(i, 0);
    }
    (hourlyCallsData as { created_at: string }[] ?? []).forEach(row => {
      const hour = new Date(row.created_at).getHours();
      hourlyCallsMap.set(hour, (hourlyCallsMap.get(hour) ?? 0) + 1);
    });
    const hourly_calls = Array.from(hourlyCallsMap.entries()).map(([hour, count]) => ({ hour, count }));

    const response: DashboardResponse = {
      stories: {
        total:    totalStories    ?? 0,
        public:   publicStories   ?? 0,
        featured: featuredStories ?? 0,
      },
      sessions: {
        total:        totalSessions  ?? 0,
        active_today: activeSessions ?? 0,
      },
      users: {
        total: totalUsers ?? 0,
      },
      system: {
        error_rate_24h,
        avg_response_ms,
        total_requests_today: geminiCallsToday ?? 0,  // Gemini API calls only
      },
      recent_events: (recentEvents as Partial<ApiLog>[]) ?? [],
      hourly_calls,
    };

    return reply.send(response);
  });
}
