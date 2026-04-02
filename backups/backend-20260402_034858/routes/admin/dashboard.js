import { requireAdminWithBasicAuth } from '../../plugins/auth.js';
export default async function adminDashboardRoute(app) {
    app.get('/admin/dashboard', async (request, reply) => {
        requireAdminWithBasicAuth(request);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        // Run all queries in parallel — avg duration delegated to DB via RPC
        const [{ count: totalStories }, { count: publicStories }, { count: featuredStories }, { count: totalSessions }, { count: activeSessions }, { count: totalUsers }, { count: reqTotal24h }, { count: reqErrors24h }, { data: avgDurationData }, { count: reqToday }, { data: recentEvents },] = await Promise.all([
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
            app.supabaseAdmin
                .from('service_logs')
                .select('*', { count: 'exact', head: true })
                .gte('timestamp', todayStart),
            app.supabaseAdmin
                .from('api_logs')
                .select('id, session_id, endpoint, request_model, response_usage, response_error, duration_ms, created_at')
                .order('created_at', { ascending: false })
                .limit(10),
        ]);
        const error_rate_24h = reqTotal24h && reqTotal24h > 0
            ? Math.round(((reqErrors24h ?? 0) / reqTotal24h) * 10000) / 100
            : 0;
        const avg_response_ms = Math.round(avgDurationData ?? 0);
        const response = {
            stories: {
                total: totalStories ?? 0,
                public: publicStories ?? 0,
                featured: featuredStories ?? 0,
            },
            sessions: {
                total: totalSessions ?? 0,
                active_today: activeSessions ?? 0,
            },
            users: {
                total: totalUsers ?? 0,
            },
            system: {
                error_rate_24h,
                avg_response_ms,
                total_requests_today: reqToday ?? 0,
            },
            recent_events: recentEvents ?? [],
        };
        return reply.send(response);
    });
}
//# sourceMappingURL=dashboard.js.map