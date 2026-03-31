// backend/src/routes/admin/status-presets.ts
// GET    /api/admin/status-presets       — list all
// POST   /api/admin/status-presets       — create
// PUT    /api/admin/status-presets/:id   — update
// DELETE /api/admin/status-presets/:id   — delete
import type { FastifyInstance } from 'fastify';
import type {
  StatusPreset,
  StatusPresetCreateInput,
  StatusPresetUpdateInput,
} from '@story-game/shared';
import { requireAdmin } from '../../plugins/auth.js';

export default async function adminStatusPresetsRoute(app: FastifyInstance) {
  // GET /api/admin/status-presets
  app.get('/api/admin/status-presets', async (request, reply) => {
    requireAdmin(request);

    const { data, error } = await app.supabaseAdmin
      .from('status_presets')
      .select('*')
      .order('genre', { ascending: true });

    if (error) {
      app.log.error(error, 'adminStatusPresetsRoute GET: query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '상태 프리셋을 불러오는데 실패했습니다' },
      });
    }

    return reply.send((data as StatusPreset[]) ?? []);
  });

  // POST /api/admin/status-presets
  app.post('/api/admin/status-presets', async (request, reply) => {
    requireAdmin(request);
    const body = request.body as StatusPresetCreateInput;

    if (!body.title) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
      });
    }

    const { data, error } = await app.supabaseAdmin
      .from('status_presets')
      .insert({
        title: body.title,
        genre: body.genre ?? '',
        attributes: body.attributes ?? [],
      })
      .select('*')
      .single();

    if (error) {
      app.log.error(error, 'adminStatusPresetsRoute POST: insert failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '상태 프리셋 생성에 실패했습니다' },
      });
    }

    return reply.status(201).send(data as StatusPreset);
  });

  // PUT /api/admin/status-presets/:id
  app.put('/api/admin/status-presets/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const body = request.body as StatusPresetUpdateInput;

    const { data, error } = await app.supabaseAdmin
      .from('status_presets')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: '상태 프리셋을 찾을 수 없습니다' },
        });
      }
      app.log.error(error, 'adminStatusPresetsRoute PUT: update failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '상태 프리셋 업데이트에 실패했습니다' },
      });
    }

    return reply.send(data as StatusPreset);
  });

  // DELETE /api/admin/status-presets/:id
  app.delete('/api/admin/status-presets/:id', async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };

    const { error } = await app.supabaseAdmin
      .from('status_presets')
      .delete()
      .eq('id', id);

    if (error) {
      app.log.error(error, 'adminStatusPresetsRoute DELETE: delete failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '상태 프리셋 삭제에 실패했습니다' },
      });
    }

    return reply.status(204).send();
  });
}
