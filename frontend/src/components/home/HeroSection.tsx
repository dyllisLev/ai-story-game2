import { type FC } from 'react';
import { Link } from 'react-router';
import { useStoryStats } from '@/hooks/useStories';

// ─── Icons ───────────────────────────────────────────────────────────────────

const PlayIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const EditIcon: FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ─── Stat number formatter ────────────────────────────────────────────────────

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K+`;
  return n.toLocaleString('ko-KR');
}

// ─── Component ───────────────────────────────────────────────────────────────

export const HeroSection: FC = () => {
  const { data: stats } = useStoryStats();

  return (
    <section
      aria-labelledby="heroTitle"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '72px 24px 56px',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Background gradient overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 30% 0%, rgba(124,109,240,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 0%, rgba(197,168,74,0.08) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Eyebrow */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 16,
        }}
      >
        AI-Powered Interactive Fiction
      </div>

      {/* Title */}
      <h1
        id="heroTitle"
        style={{
          fontFamily: "'Noto Serif KR', serif",
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.03em',
          marginBottom: 16,
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        당신만의 이야기를
        <br />
        펼쳐보세요
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 40,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        AI와 함께 무한한 세계를 탐험하는 인터랙티브 스토리
      </p>

      {/* Stats */}
      <div
        role="list"
        aria-label="서비스 통계"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 48,
          flexWrap: 'wrap',
          marginBottom: 40,
        }}
      >
        <div role="listitem" style={statStyle}>
          <span
            aria-label={`활성 스토리 ${stats?.total_stories ?? 0}개`}
            style={statNumStyle}
          >
            {stats ? formatStat(stats.total_stories) : '—'}
          </span>
          <span style={statLabelStyle}>활성 스토리</span>
        </div>
        <div role="listitem" style={statStyle}>
          <span
            aria-label={`총 플레이 ${stats?.total_plays ?? 0}회`}
            style={statNumStyle}
          >
            {stats ? formatStat(stats.total_plays) : '—'}
          </span>
          <span style={statLabelStyle}>총 플레이</span>
        </div>
        <div role="listitem" style={statStyle}>
          <span
            aria-label={`작성자 ${stats?.total_authors ?? 0}명`}
            style={statNumStyle}
          >
            {stats ? formatStat(stats.total_authors) : '—'}
          </span>
          <span style={statLabelStyle}>작성자</span>
        </div>
      </div>

      {/* CTA buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/play"
          style={ctaPrimaryStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover, #d4b85a)';
            e.currentTarget.style.boxShadow = '0 0 28px var(--accent-glow)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <PlayIcon />
          스토리 플레이하기
        </Link>
        <Link
          to="/editor"
          style={ctaSecondaryStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-card)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <EditIcon />
          새 스토리 만들기
        </Link>
      </div>
    </section>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const statStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const statNumStyle: React.CSSProperties = {
  fontFamily: "'Noto Serif KR', serif",
  fontSize: 26,
  fontWeight: 700,
  color: 'var(--accent)',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
};

const ctaPrimaryStyle: React.CSSProperties = {
  height: 44,
  padding: '0 28px',
  background: 'var(--accent)',
  color: '#0a0a0f',
  border: 'none',
  borderRadius: 10,
  fontFamily: "'Noto Sans KR', sans-serif",
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all var(--transition)',
  textDecoration: 'none',
};

const ctaSecondaryStyle: React.CSSProperties = {
  height: 44,
  padding: '0 28px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-secondary)',
  fontFamily: "'Noto Sans KR', sans-serif",
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all var(--transition)',
  textDecoration: 'none',
};
