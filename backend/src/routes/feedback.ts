// backend/src/routes/feedback.ts
// AI-253: 사용자 피드백 수집 시스템 기술 구현
// POST /feedback — 피드백 저장 (prefix /api/v1로 /api/v1/feedback 됨)
// GET  /feedback/admin/stats — 관리자 통계
import type { FastifyInstance } from 'fastify';
import type {
  FeedbackCreateInput,
  FeedbackAdminStats,
  FeedbackRatingCategory,
} from '@story-game/shared';
import { requireLogin, requireAdmin } from '../plugins/auth.js';
import { cachedQuery, CacheTags, CacheTTL } from '../services/cache.js';

export default async function feedbackRoutes(app: FastifyInstance) {
  // POST /feedback — 피드백 저장
  app.post('/feedback', async (request, reply) => {
    const user = requireLogin(request);

    const body = request.body as FeedbackCreateInput;
    const { session_id, story_id, genre, ratings, comments = '', feedback_tags = [] } = body;

    // 필수 필드 검증
    if (!session_id || !story_id || !genre || !ratings) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: '필수 필드가 누락되었습니다',
        },
      });
    }

    // ratings 검증 (1-5 사이의 값)
    for (const [key, value] of Object.entries(ratings)) {
      if (typeof value !== 'number' || value < 1 || value > 5) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: `${key} 평점은 1-5 사이의 값이어야 합니다`,
          },
        });
      }
    }

    // overall 평점이 없으면 자동 계산
    const finalRatings = { ...ratings };
    if (!finalRatings.overall) {
      const ratingValues = Object.values(finalRatings).filter((v) => typeof v === 'number');
      if (ratingValues.length > 0) {
        finalRatings.overall = Math.round(
          ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length
        );
      } else {
        finalRatings.overall = 3; // 기본값
      }
    }

    try {
      const { data, error } = await app.supabaseAdmin
        .from('story_feedback')
        .insert({
          session_id,
          story_id,
          user_id: user.id,
          genre,
          ratings: finalRatings,
          comments,
          feedback_tags,
        })
        .select('id, created_at')
        .single();

      if (error) {
        app.log.error(error, 'POST /feedback: database error');
        return reply.status(500).send({
          error: {
            code: 'DATABASE_ERROR',
            message: '피드백 저장에 실패했습니다',
          },
        });
      }

      // 캐시 무효화
      await app.cache.invalidateByTag(CacheTags.FEEDBACK_STATS);

      return reply.status(201).send({
        id: data.id,
        message: '피드백이 저장되었습니다',
        created_at: data.created_at,
      });
    } catch (error) {
      app.log.error(error, 'POST /feedback: unexpected error');
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: '서버 오류가 발생했습니다',
        },
      });
    }
  });

  // GET /feedback/admin/stats — 관리자 통계
  app.get('/feedback/admin/stats', async (request, reply) => {
    requireAdmin(request);

    try {
      const stats = await cachedQuery(
        app.cache,
        'feedback:admin:stats',
        async () => {
          // 전체 피드백 수
          const { count: total_feedbacks, error: countError } = await app.supabaseAdmin
            .from('story_feedback')
            .select('*', { count: 'exact', head: true });

          if (countError) throw countError;

          // 고유 사용자 수
          const { data: usersData, error: usersError } = await app.supabaseAdmin
            .from('story_feedback')
            .select('user_id');

          if (usersError) throw usersError;
          const unique_users = new Set(usersData.map((d) => d.user_id).filter((id) => id != null))
            .size;

          // 고유 세션 수
          const { data: sessionsData, error: sessionsError } = await app.supabaseAdmin
            .from('story_feedback')
            .select('session_id');

          if (sessionsError) throw sessionsError;
          const unique_sessions = new Set(sessionsData.map((d) => d.session_id)).size;

          // 장르별 통계
          const { data: genreData, error: genreError } = await app.supabaseAdmin
            .from('story_feedback')
            .select('genre, ratings');

          if (genreError) throw genreError;

          const genreBreakdown = genreData.reduce((acc, item) => {
            const existing = acc.find((g) => g.genre === item.genre);
            const overallRating = (item.ratings as any)?.overall || 3;

            if (existing) {
              existing.count += 1;
              existing.sum_rating += overallRating;
            } else {
              acc.push({
                genre: item.genre as any,
                count: 1,
                sum_rating: overallRating,
              });
            }
            return acc;
          }, [] as Array<{ genre: string; count: number; sum_rating: number }>);

          const genre_breakdown = genreBreakdown.map((g) => ({
            genre: g.genre as any,
            count: g.count,
            avg_overall_rating: Math.round((g.sum_rating / g.count) * 10) / 10,
          }));

          // 평균 평점 계산
          const rating_averages: Partial<Record<FeedbackRatingCategory, number>> = {};
          const categorySums: Record<string, { sum: number; count: number }> = {};

          genreData.forEach((item) => {
            const ratings = item.ratings as Record<string, number>;
            Object.entries(ratings).forEach(([category, value]) => {
              if (!categorySums[category]) {
                categorySums[category] = { sum: 0, count: 0 };
              }
              categorySums[category].sum += value;
              categorySums[category].count += 1;
            });
          });

          Object.entries(categorySums).forEach(([category, data]) => {
            rating_averages[category as FeedbackRatingCategory] =
              Math.round((data.sum / data.count) * 10) / 10;
          });

          // 가장 흔한 태그
          const { data: tagsData, error: tagsError } = await app.supabaseAdmin
            .from('story_feedback')
            .select('feedback_tags');

          if (tagsError) throw tagsError;

          const tagCounts: Record<string, number> = {};
          tagsData.forEach((item) => {
            const tags = item.feedback_tags as string[];
            tags.forEach((tag) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          });

          const most_common_tags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          // 최근 7일/30일 피드백 수
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { count: feedbacks_last_7_days } = await app.supabaseAdmin
            .from('story_feedback')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

          const { count: feedbacks_last_30_days } = await app.supabaseAdmin
            .from('story_feedback')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

          return {
            total_feedbacks: total_feedbacks || 0,
            unique_users,
            unique_sessions,
            genre_breakdown,
            rating_averages,
            most_common_tags,
            feedbacks_last_7_days: feedbacks_last_7_days || 0,
            feedbacks_last_30_days: feedbacks_last_30_days || 0,
          } as FeedbackAdminStats;
        },
        {
          ttl: CacheTTL.MEDIUM, // 1 hour
          tags: [CacheTags.FEEDBACK_STATS],
        }
      );

      return reply.send(stats);
    } catch (error) {
      app.log.error(error, 'GET /feedback/admin/stats: error');
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: '통계 조회에 실패했습니다',
        },
      });
    }
  });
}
