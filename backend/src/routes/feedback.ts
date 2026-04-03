// backend/src/routes/feedback.ts
// AI-253: 사용자 피드백 수집 시스템 기술 구현
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

      // 캐시 무효화 (비동기, 응답 차단 방지)
      app.cache.invalidateByTag(CacheTags.FEEDBACK_STATS).catch((e) => app.log.warn(e, 'cache invalidate failed'));

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
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

          // 병렬 쿼리: 전체 데이터 + 최근 7일/30일 카운트
          const [allDataResult, last7DaysResult, last30DaysResult] = await Promise.all([
            app.supabaseAdmin
              .from('story_feedback')
              .select('user_id, session_id, genre, ratings, feedback_tags'),
            app.supabaseAdmin
              .from('story_feedback')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', sevenDaysAgo),
            app.supabaseAdmin
              .from('story_feedback')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', thirtyDaysAgo),
          ]);

          if (allDataResult.error) throw allDataResult.error;
          const allData = allDataResult.data ?? [];

          // 단일 패스로 모든 통계 계산
          const uniqueUsers = new Set<string>();
          const uniqueSessions = new Set<string>();
          const genreMap = new Map<string, { count: number; sum_rating: number }>();
          const categorySums: Record<string, { sum: number; count: number }> = {};
          const tagCounts: Record<string, number> = {};

          for (const item of allData) {
            // 고유 사용자/세션 수집
            if (item.user_id) uniqueUsers.add(item.user_id);
            uniqueSessions.add(item.session_id);

            // 장르별 통계 (Map 사용 - O(n))
            const overallRating = (item.ratings?.overall as number) || 3;
            const existing = genreMap.get(item.genre);
            if (existing) {
              existing.count += 1;
              existing.sum_rating += overallRating;
            } else {
              genreMap.set(item.genre, { count: 1, sum_rating: overallRating });
            }

            // 카테고리별 평점 합계
            if (item.ratings) {
              for (const [category, value] of Object.entries(item.ratings)) {
                if (typeof value === 'number') {
                  if (!categorySums[category]) {
                    categorySums[category] = { sum: 0, count: 0 };
                  }
                  categorySums[category].sum += value;
                  categorySums[category].count += 1;
                }
              }
            }

            // 태그 카운트
            if (item.feedback_tags) {
              for (const tag of item.feedback_tags) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              }
            }
          }

          // 결과 조립
          const genre_breakdown = Array.from(genreMap.entries()).map(([genre, g]) => ({
            genre,
            count: g.count,
            avg_overall_rating: Math.round((g.sum_rating / g.count) * 10) / 10,
          }));

          const rating_averages: Partial<Record<FeedbackRatingCategory, number>> = {};
          for (const [category, data] of Object.entries(categorySums)) {
            rating_averages[category as FeedbackRatingCategory] =
              Math.round((data.sum / data.count) * 10) / 10;
          }

          const most_common_tags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          return {
            total_feedbacks: allData.length,
            unique_users: uniqueUsers.size,
            unique_sessions: uniqueSessions.size,
            genre_breakdown,
            rating_averages,
            most_common_tags,
            feedbacks_last_7_days: last7DaysResult.count ?? 0,
            feedbacks_last_30_days: last30DaysResult.count ?? 0,
          } as FeedbackAdminStats;
        },
        {
          ttl: CacheTTL.MEDIUM,
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
