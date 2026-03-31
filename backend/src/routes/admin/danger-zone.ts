// backend/src/routes/admin/danger-zone.ts
// DELETE /api/admin/danger-zone/sessions — delete all session data
// DELETE /api/admin/danger-zone/logs     — delete all logs (service + api)
// DELETE /api/admin/danger-zone/all      — delete all data (sessions + logs)
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../plugins/auth.js';

export default async function adminDangerZoneRoute(app: FastifyInstance) {
  // DELETE /api/admin/danger-zone/sessions — wipe all sessions
  app.delete('/api/admin/danger-zone/sessions', async (request, reply) => {
    requireAdmin(request);

    const { error } = await app.supabaseAdmin
      .from('sessions')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      app.log.error(error, 'dangerZone DELETE sessions: failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '세션 삭제에 실패했습니다' },
      });
    }

    app.log.warn({ admin: request.user?.id }, 'DANGER: all sessions deleted');
    return reply.status(204).send();
  });

  // DELETE /api/admin/danger-zone/logs — wipe service_logs + api_logs
  app.delete('/api/admin/danger-zone/logs', async (request, reply) => {
    requireAdmin(request);

    const [{ error: svcErr }, { error: apiErr }] = await Promise.all([
      app.supabaseAdmin
        .from('service_logs')
        .delete()
        .gte('timestamp', '1970-01-01T00:00:00Z'),
      app.supabaseAdmin
        .from('api_logs')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00Z'),
    ]);

    if (svcErr || apiErr) {
      app.log.error({ svcErr, apiErr }, 'dangerZone DELETE logs: partial failure');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '로그 삭제에 실패했습니다' },
      });
    }

    app.log.warn({ admin: request.user?.id }, 'DANGER: all logs deleted');
    return reply.status(204).send();
  });

  // DELETE /api/admin/danger-zone/all — wipe sessions + logs
  app.delete('/api/admin/danger-zone/all', async (request, reply) => {
    requireAdmin(request);

    const [{ error: sessErr }, { error: svcErr }, { error: apiErr }] =
      await Promise.all([
        app.supabaseAdmin
          .from('sessions')
          .delete()
          .gte('created_at', '1970-01-01T00:00:00Z'),
        app.supabaseAdmin
          .from('service_logs')
          .delete()
          .gte('timestamp', '1970-01-01T00:00:00Z'),
        app.supabaseAdmin
          .from('api_logs')
          .delete()
          .gte('created_at', '1970-01-01T00:00:00Z'),
      ]);

    if (sessErr || svcErr || apiErr) {
      app.log.error({ sessErr, svcErr, apiErr }, 'dangerZone DELETE all: partial failure');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '전체 데이터 삭제 중 일부 작업이 실패했습니다' },
      });
    }

    app.log.warn({ admin: request.user?.id }, 'DANGER: full data wipe executed');
    return reply.status(204).send();
  });
}
