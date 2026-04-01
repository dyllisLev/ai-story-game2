// backend/src/routes/stories/presets.ts
// GET    /presets          — list all presets (public)
// POST   /presets          — create preset (admin)
// PUT    /presets/:id      — update preset (admin)
// DELETE /presets/:id      — delete preset (admin)
// GET    /status-presets   — list status presets (public, for editor)
import type { FastifyInstance } from 'fastify';
import type { PresetCreateInput, PresetUpdateInput } from '@story-game/shared';
import { requireAdmin } from '../../plugins/auth.js';

export default async function presetsRoute(app: FastifyInstance) {
  // GET /presets — public list with status_preset JOIN
  app.get('/presets', async (_request, reply) => {
    const { data, error } = await app.supabaseAdmin
      .from('presets')
      .select('*, status_preset:status_presets(id, title, genre)')
      .order('created_at', { ascending: false });

    if (error) {
      app.log.error(error, 'presetsRoute GET /api/presets: query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '프리셋을 불러오는데 실패했습니다' },
      });
    }

    return reply.send(data ?? []);
  });

  // GET /status-presets — public list for editor dropdown
  app.get('/status-presets', async (_request, reply) => {
    const { data, error } = await app.supabaseAdmin
      .from('status_presets')
      .select('*')
      .order('genre', { ascending: true });

    if (error) {
      app.log.error(error, 'presetsRoute GET /api/status-presets: query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '상태 프리셋을 불러오는데 실패했습니다' },
      });
    }

    return reply.send(data ?? []);
  });

  // POST /presets — create (admin only)
  app.post('/presets', async (request, reply) => {
    requireAdmin(request);
    const body = request.body as PresetCreateInput;

    if (!body.title) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
      });
    }

    const { data, error } = await app.supabaseAdmin
      .from('presets')
      .insert(body)
      .select('*')
      .single();

    if (error) {
      app.log.error(error, 'presetsRoute POST: insert failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '프리셋 생성에 실패했습니다' },
      });
    }

    return reply.status(201).send(data);
  });

  // PUT /presets/:id — update (admin only)
  app.put('/presets/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const body = request.body as PresetUpdateInput;

    const { data, error } = await app.supabaseAdmin
      .from('presets')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: '프리셋을 찾을 수 없습니다' },
        });
      }
      app.log.error(error, 'presetsRoute PUT: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '프리셋 업데이트에 실패했습니다' },
      });
    }

    return reply.send(data);
  });

  // DELETE /presets/:id — delete (admin only)
  app.delete('/presets/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };

    const { error } = await app.supabaseAdmin
      .from('presets')
      .delete()
      .eq('id', id);

    if (error) {
      app.log.error(error, 'presetsRoute DELETE: delete failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '프리셋 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
