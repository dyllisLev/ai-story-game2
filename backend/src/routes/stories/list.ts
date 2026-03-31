// backend/src/routes/stories/list.ts
import type { FastifyInstance } from 'fastify';
import type {
  StoryFilterParams,
  PaginatedResponse,
  StoryListItem,
} from '@story-game/shared';
import { buildPaginatedResponse } from '../../lib/pagination.js';
import { STORIES_COLUMNS, mapToStoryListItem } from '../../lib/story-helpers.js';

export default async function storiesListRoute(app: FastifyInstance) {
  app.get('/api/stories', {
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

    let q = app.supabaseAdmin
      .from('stories')
      .select(STORIES_COLUMNS.join(', '), { count: 'exact' });

    if (genre) {
      q = q.eq('genre', genre);
    }
    if (search) {
      const safe = search.replace(/[%_]/g, '\\$&');
      q = q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    if (featured === true) {
      q = q.contains('tags', ['featured']);
    }

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      latest:  { column: 'created_at', ascending: false },
      popular: { column: 'created_at', ascending: false },
      name:    { column: 'title',      ascending: true  },
    };
    const { column, ascending } = sortMap[sort] ?? sortMap.latest;
    q = q
      .order(column, { ascending })
      .range(offset, offset + limitNum - 1);

    const { data, count, error } = await q;
    if (error) {
      app.log.error(error, 'storiesListRoute: supabase query failed');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: '스토리 목록을 불러오는데 실패했습니다' },
      });
    }

    const stories = data?.map(mapToStoryListItem) ?? [];
    return reply.send(buildPaginatedResponse<StoryListItem>(stories, count, pageNum, limitNum));
  });
}
