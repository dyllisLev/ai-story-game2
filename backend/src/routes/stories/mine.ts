// backend/src/routes/stories/mine.ts
import type { FastifyInstance } from 'fastify';
import type {
  StoryFilterParams,
  PaginatedResponse,
  StoryListItem,
} from '@story-game/shared';
import { buildPaginatedResponse } from '../../lib/pagination.js';
import { requireAuth } from '../../plugins/auth.js';
import { STORIES_TABLE_FIELDS_STR } from '../../lib/story-constants.js';
import { sanitizeLikePattern } from '../../lib/sanitization.js';

export default async function storiesMineRoute(app: FastifyInstance) {
  app.get('/stories/mine', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          genre:    { type: 'string' },
          search:   { type: 'string' },
          sort:     { type: 'string', enum: ['latest', 'popular', 'name'] },
          featured: { type: 'boolean' },
          page:     { type: 'integer', minimum: 1, default: 1 },
          limit:    { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const user = requireAuth(request);
    const query = request.query as StoryFilterParams;
    const {
      genre,
      search,
      sort = 'latest',
      featured,
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    // Query stories table for user's own stories
    let q = app.supabaseAdmin
      .from('stories')
      .select(STORIES_TABLE_FIELDS_STR, { count: 'exact' })
      .eq('owner_uid', user.id);

    if (genre) {
      q = q.contains('tags', [genre]);
    }
    if (search) {
      const safe = sanitizeLikePattern(search);
      q = q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    if (featured === true) {
      q = q.eq('is_featured', true);
    }

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      latest:  { column: 'created_at', ascending: false },
      popular: { column: 'play_count', ascending: false },
      name:    { column: 'title',      ascending: true  },
    };
    const { column, ascending } = sortMap[sort] ?? sortMap.latest;
    q = q
      .order(column, { ascending })
      .range(offset, offset + limitNum - 1);

    const { data, count, error } = await q;
    if (error) {
      app.log.error(error, 'storiesMineRoute: supabase query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '내 스토리 목록을 불러오는데 실패했습니다' },
      });
    }

    return reply.send(buildPaginatedResponse<StoryListItem>(data as unknown as StoryListItem[] ?? [], count, pageNum, limitNum));
  });
}
