// frontend/src/components/admin/FeedbackStats.tsx
// AI-264: 관리자 피드백 통계 컴포넌트
import { type FC } from 'react';
import { useFeedbackStats } from '@/hooks/useFeedbackStats';
import type { FeedbackRatingCategory, Genre } from '@story-game/shared';

// 한국어 장르 이름 매핑
const GENRE_NAMES: Record<Genre, string> = {
  fantasy: '판타지',
  modern: '현대',
  romance: '로맨스',
  mystery: '미스터리',
  horror: '호러',
  scifi: 'SF',
  thriller: '스릴러',
  historical: '역사',
  comedy: '코미디',
};

// 한국어 카테고리 이름 매핑
const RATING_CATEGORY_NAMES: Record<FeedbackRatingCategory, string> = {
  story_quality: '스토리 품질',
  character_development: '캐릭터 개발',
  pacing: '전개 속도',
  engagement: '몰입감',
  writing_style: '문체',
  overall: '종합 평가',
};

export const FeedbackStats: FC = () => {
  const { stats, isLoading, error, refetch } = useFeedbackStats();

  if (isLoading) {
    return (
      <div className="a-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <span style={{ color: 'var(--a-ink-muted)' }}>로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="a-section" style={{ padding: 'var(--space-6)' }}>
        <div style={{ color: 'var(--a-ink-error)', marginBottom: 'var(--space-3)' }}>
          오류: {error.message}
        </div>
        <button className="a-btn" onClick={refetch} type="button">
          다시 시도
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="a-section" style={{ padding: 'var(--space-6)' }}>
        <span style={{ color: 'var(--a-ink-muted)' }}>데이터 없음</span>
      </div>
    );
  }

  const hasData = stats.total_feedbacks > 0;

  return (
    <div className="a-section" style={{ padding: 'var(--space-6)' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--a-ink-primary)', marginBottom: 'var(--space-1)' }}>
            피드백 통계
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--a-ink-muted)' }}>
            사용자 피드백 데이터를 분석한 대시보드입니다
          </p>
        </div>
        <button className="a-btn" onClick={refetch} type="button">
          새로고침
        </button>
      </div>

      {!hasData ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--a-ink-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📊</div>
          <p style={{ fontSize: 'var(--font-base)' }}>아직 피드백이 없습니다</p>
          <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }}>
            사용자들이 피드백을 제출하면 여기에 통계가 표시됩니다
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* 요약 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <StatCard label="총 피드백 수" value={stats.total_feedbacks.toLocaleString()} icon="💬" />
            <StatCard label="고유 사용자 수" value={stats.unique_users.toLocaleString()} icon="👤" />
            <StatCard label="고유 세션 수" value={stats.unique_sessions.toLocaleString()} icon="🎮" />
            <StatCard label="최근 7일" value={stats.feedbacks_last_7_days.toLocaleString()} icon="📅" />
            <StatCard label="최근 30일" value={stats.feedbacks_last_30_days.toLocaleString()} icon="📆" />
          </div>

          {/* 장르별 평점 */}
          {stats.genre_breakdown.length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--a-ink-primary)', marginBottom: 'var(--space-4)' }}>
                장르별 평점
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                {stats.genre_breakdown.map((item) => (
                  <GenreStatCard
                    key={item.genre}
                    genre={item.genre}
                    count={item.count}
                    avgRating={item.avg_overall_rating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 카테고리별 평균 평점 */}
          {stats.rating_averages && Object.keys(stats.rating_averages).length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--a-ink-primary)', marginBottom: 'var(--space-4)' }}>
                카테고리별 평균 평점
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                {Object.entries(stats.rating_averages).map(([category, rating]) => (
                  <RatingStatCard
                    key={category}
                    category={category as FeedbackRatingCategory}
                    rating={rating ?? 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 인기 태그 */}
          {stats.most_common_tags.length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--a-ink-primary)', marginBottom: 'var(--space-4)' }}>
                인기 태그 Top 10
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {stats.most_common_tags.map((item, index) => (
                  <TagBadge key={item.tag} tag={item.tag} count={item.count} rank={index + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 요약 카드 컴포넌트
interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

const StatCard: FC<StatCardProps> = ({ label, value, icon }) => (
  <div style={{
    background: 'var(--a-bg-card)',
    border: '1px solid var(--a-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--a-ink-muted)', fontWeight: 'var(--weight-medium)' }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--a-ink-primary)' }}>
      {value}
    </div>
  </div>
);

// 장르별 통계 카드
interface GenreStatCardProps {
  genre: Genre;
  count: number;
  avgRating: number;
}

const GenreStatCard: FC<GenreStatCardProps> = ({ genre, count, avgRating }) => (
  <div style={{
    background: 'var(--a-bg-card)',
    border: '1px solid var(--a-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 'var(--font-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--a-ink-primary)' }}>
        {GENRE_NAMES[genre]}
      </span>
      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--a-ink-muted)' }}>
        {count}개
      </span>
    </div>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--a-brand)' }}>
          {avgRating.toFixed(1)}
        </span>
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--a-ink-muted)' }}> / 5.0</span>
      </div>
      <RatingBar value={avgRating} max={5} />
    </div>
  </div>
);

// 평점 카드
interface RatingStatCardProps {
  category: FeedbackRatingCategory;
  rating: number;
}

const RatingStatCard: FC<RatingStatCardProps> = ({ category, rating }) => (
  <div style={{
    background: 'var(--a-bg-card)',
    border: '1px solid var(--a-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  }}>
    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--a-ink-muted)', fontWeight: 'var(--weight-medium)' }}>
      {RATING_CATEGORY_NAMES[category]}
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span style={{ fontSize: 'var(--font-xl)', fontWeight: 'var(--weight-bold)', color: 'var(--a-brand)' }}>
        {rating.toFixed(1)}
      </span>
      <RatingBar value={rating} max={5} />
    </div>
  </div>
);

// 평점 바 컴포넌트
interface RatingBarProps {
  value: number;
  max: number;
}

const RatingBar: FC<RatingBarProps> = ({ value, max }) => {
  const percentage = (value / max) * 100;
  return (
    <div style={{
      width: '100%',
      height: '8px',
      background: 'var(--a-bg-muted)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${percentage}%`,
        height: '100%',
        background: 'var(--a-brand)',
        borderRadius: 'var(--radius-full)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
};

// 태그 뱃지
interface TagBadgeProps {
  tag: string;
  count: number;
  rank: number;
}

const TagBadge: FC<TagBadgeProps> = ({ tag, count, rank }) => {
  // 한국어 태그 이름 매핑 (선택사항)
  const tagLabel = tag.replace(/_/g, ' ');

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--a-bg-elevated)',
      border: '1px solid var(--a-border)',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-sm)',
    }}>
      <span style={{
        width: '20px',
        height: '20px',
        borderRadius: 'var(--radius-full)',
        background: rank <= 3 ? 'var(--a-brand)' : 'var(--a-bg-muted)',
        color: rank <= 3 ? 'white' : 'var(--a-ink-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--font-xs)',
        fontWeight: 'var(--weight-semibold)',
      }}>
        {rank}
      </span>
      <span style={{ color: 'var(--a-ink-primary)' }}>{tagLabel}</span>
      <span style={{ color: 'var(--a-ink-muted)', fontSize: 'var(--font-xs)' }}>({count})</span>
    </div>
  );
};
