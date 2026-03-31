// backend/src/routes/admin/users.ts
// GET    /api/admin/users          — 유저 목록 (role 필터 가능)
// PUT    /api/admin/users/:id/role — 유저 role 변경
// DELETE /api/admin/users/:id      — 유저 삭제
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../plugins/auth.js';

export default async function adminUsersRoutes(app: FastifyInstance) {
  // GET /api/admin/users
  app.get<{
    Querystring: { role?: string; page?: string; limit?: string; search?: string };
  }>('/api/admin/users', async (request, reply) => {
    requireAdmin(request);

    const role = request.query.role;
    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '50', 10)));
    const offset = (page - 1) * limit;
    const search = request.query.search?.trim();

    let query = app.supabaseAdmin
      .from('user_profiles')
      .select('id, nickname, role, created_at, updated_at', { count: 'exact' });

    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.ilike('nickname', `%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      app.log.error(error, 'adminUsers GET: query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '사용자 목록을 불러오는데 실패했습니다' },
      });
    }

    // Supabase auth에서 이메일 정보 가져오기
    const userIds = (data ?? []).map((u) => u.id);
    const usersWithEmail = await Promise.all(
      userIds.map(async (uid: string) => {
        const { data: { user } } = await app.supabaseAdmin.auth.admin.getUserById(uid);
        const profile = (data ?? []).find((u) => u.id === uid);
        return {
          ...profile,
          email: user?.email ?? '',
        };
      })
    );

    return reply.send({
      data: usersWithEmail,
      total: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    });
  });

  // PUT /api/admin/users/:id/role
  app.put<{
    Params: { id: string };
    Body: { role: string };
  }>('/api/admin/users/:id/role', async (request, reply) => {
    requireAdmin(request);

    const { id } = request.params;
    const { role } = request.body;

    if (!['pending', 'user', 'admin'].includes(role)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: "role은 'pending', 'user', 'admin' 중 하나여야 합니다" },
      });
    }

    // 자기 자신의 role은 변경 불가
    if (request.user?.id === id) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: '자신의 권한은 변경할 수 없습니다' },
      });
    }

    const { data, error } = await app.supabaseAdmin
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, nickname, role, created_at, updated_at')
      .single();

    if (error || !data) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' },
      });
    }

    return reply.send(data);
  });

  // DELETE /api/admin/users/:id
  app.delete<{ Params: { id: string } }>('/api/admin/users/:id', async (request, reply) => {
    requireAdmin(request);

    const { id } = request.params;

    // 자기 자신은 삭제 불가
    if (request.user?.id === id) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: '자신의 계정은 삭제할 수 없습니다' },
      });
    }

    const { error } = await app.supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      app.log.error(error, 'adminUsers DELETE: failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '사용자 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
