// backend/src/routes/admin/danger-zone.ts
// DELETE /api/admin/danger-zone/sessions — delete all session data
// DELETE /api/admin/danger-zone/logs     — delete all logs (service + api)
// DELETE /api/admin/danger-zone/all      — delete all data (sessions + logs)
// POST /api/admin/danger-zone/truncate-stories — truncate all stories
// POST /api/admin/danger-zone/truncate-sessions — truncate all sessions
// POST /api/admin/danger-zone/reset-config — reset config to defaults
import type { FastifyInstance } from 'fastify';
import { requireAdminWithBasicAuth } from '../../plugins/auth.js';

export default async function adminDangerZoneRoute(app: FastifyInstance) {
  // DELETE /api/admin/danger-zone/sessions — wipe all sessions
  app.delete('/admin/danger-zone/sessions', async (request, reply) => {
    requireAdminWithBasicAuth(request);

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
  app.delete('/admin/danger-zone/logs', async (request, reply) => {
    requireAdminWithBasicAuth(request);

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
  app.delete('/admin/danger-zone/all', async (request, reply) => {
    requireAdminWithBasicAuth(request);

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

  // POST /api/admin/danger-zone/truncate-stories — truncate all stories
  app.post('/admin/danger-zone/truncate-stories', async (request, reply) => {
    requireAdminWithBasicAuth(request);

    const { error } = await app.supabaseAdmin
      .from('stories')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      app.log.error(error, 'dangerZone TRUNCATE stories: failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '스토리 삭제에 실패했습니다' },
      });
    }

    app.log.warn({ admin: request.user?.id }, 'DANGER: all stories truncated');
    return reply.status(204).send();
  });

  // POST /api/admin/danger-zone/truncate-sessions — truncate all sessions
  app.post('/admin/danger-zone/truncate-sessions', async (request, reply) => {
    requireAdminWithBasicAuth(request);

    const { error } = await app.supabaseAdmin
      .from('sessions')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      app.log.error(error, 'dangerZone TRUNCATE sessions: failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '세션 삭제에 실패했습니다' },
      });
    }

    app.log.warn({ admin: request.user?.id }, 'DANGER: all sessions truncated');
    return reply.status(204).send();
  });

  // POST /api/admin/danger-zone/reset-config — reset config to defaults
  app.post('/admin/danger-zone/reset-config', async (request, reply) => {
    requireAdminWithBasicAuth(request);

    // Delete all config rows; they will be recreated by defaults or seed data
    const { error } = await app.supabaseAdmin
      .from('config')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      app.log.error(error, 'dangerZone RESET config: failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '설정 초기화에 실패했습니다' },
      });
    }

    app.log.warn({ admin: request.user?.id }, 'DANGER: config reset to defaults');
    return reply.status(204).send();
  });

  // POST /api/admin/danger-zone/fix-schema — TEMPORARY: Fix schema name inconsistency
  app.post('/admin/danger-zone/fix-schema', async (request, reply) => {
    requireAdminWithBasicAuth(request);

    try {
      // Fix stories_safe view reference from ai_story_game to story_game
      const fixSQL = `
        -- Drop old views if they exist
        DROP VIEW IF EXISTS ai_story_game.stories_safe;
        DROP VIEW IF EXISTS story_game.stories_safe;

        -- Recreate stories_safe view in correct schema
        CREATE VIEW story_game.stories_safe
        WITH (security_invoker = false)
        AS SELECT
          id, title, description, tags, icon, banner_gradient,
          play_count, like_count, badge, is_featured, owner_name,
          world_setting, story, character_name, character_setting,
          characters, user_note, system_rules, use_latex,
          is_public, preset, (password_hash IS NOT NULL) AS has_password,
          owner_uid, created_at, updated_at
        FROM story_game.stories
        WHERE is_public = true;

        GRANT SELECT ON story_game.stories_safe TO anon, authenticated;
      `;

      // Execute SQL using raw PostgreSQL query through Supabase
      const { data, error } = await app.supabaseAdmin.rpc('exec_sql', {
        sql_query: fixSQL
      });

      // If exec_sql doesn't exist, try direct query
      if (error && error.message.includes('exec_sql')) {
        // Fallback: the view will be fixed when migration is applied manually
        app.log.warn({ error }, 'fix-schema: exec_sql not available, manual migration required');
        return reply.status(202).send({
          message: 'Migration requires manual execution. Please run: supabase/migrations/20260401010000_fix_schema_name_inconsistency.sql',
        });
      }

      if (error) {
        app.log.error(error, 'fix-schema: execution failed');
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Schema fix failed: ' + error.message },
        });
      }

      app.log.warn({ admin: request.user?.id }, 'DANGER: schema fix applied');
      return reply.send({ ok: true, message: 'Schema fix applied successfully' });
    } catch (err: any) {
      app.log.error(err, 'fix-schema: unexpected error');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Schema fix error: ' + err.message },
      });
    }
  });
}
