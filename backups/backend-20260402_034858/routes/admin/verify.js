import { requireLogin } from '../../plugins/auth.js';
export default async function adminVerifyRoute(app) {
    app.get('/admin/verify', async (request, reply) => {
        // Require user to be logged in (pending users are also allowed - we check their role)
        const user = requireLogin(request);
        // Check actual role from database (not just JWT claim)
        const { data: profile, error } = await app.supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (error) {
            app.log.error(error, 'adminVerify GET: profile query failed');
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: '사용자 정보를 불러오는데 실패했습니다' },
            });
        }
        const actualRole = profile?.role || 'pending';
        const isAdmin = actualRole === 'admin';
        const response = {
            isAdmin,
            userId: user.id,
            email: user.email,
            role: actualRole,
        };
        return reply.send(response);
    });
}
//# sourceMappingURL=verify.js.map