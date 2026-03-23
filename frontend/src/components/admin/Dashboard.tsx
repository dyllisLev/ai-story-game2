import { type FC } from 'react';
import { useAdminDashboard, type RecentEvent } from '../../hooks/useAdminDashboard';
import { formatTime, formatNumber } from '../../lib/format';

function eventBadgeClass(level: RecentEvent['level']): string {
  switch (level) {
    case 'warn':  return 'a-badge a-badge-warn';
    case 'error': return 'a-badge a-badge-err';
    default:      return 'a-badge a-badge-ok';
  }
}

function eventLevelLabel(level: RecentEvent['level']): string {
  switch (level) {
    case 'warn':  return '경고';
    case 'error': return '오류';
    default:      return '정보';
  }
}

/* ── Mini bar chart ── */
interface ChartProps {
  data: Array<{ hour: number; count: number }>;
}

const HourlyChart: FC<ChartProps> = ({ data }) => {
  const maxCount = Math.max(1, ...data.map(d => d.count));
  const bars = Array.from({ length: 24 }, (_, h) => {
    const bucket = data.find(d => d.hour === h);
    return { hour: h, count: bucket?.count ?? 0 };
  });

  return (
    <div>
      <div className="a-mini-chart">
        {bars.map(b => (
          <div
            key={b.hour}
            className="a-bar"
            style={{ height: `${Math.max(4, (b.count / maxCount) * 46)}px` }}
            title={`${b.hour}시: ${formatNumber(b.count)}회`}
          />
        ))}
      </div>
      <div className="a-chart-labels">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>24시</span>
      </div>
    </div>
  );
};

/* ── Main component ── */

export const Dashboard: FC = () => {
  const { stats, systemStatus, isLoading, refetch } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="a-section">
        <div className="a-section-header">
          <div className="a-section-title">대시보드</div>
        </div>
        <div style={{ color: 'var(--a-ink-muted)', fontFamily: 'var(--a-font-ui)', fontSize: '12px' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">대시보드</div>
        <div className="a-section-subtitle">
          {dateStr} · 마지막 업데이트 방금 전
          <button
            onClick={() => void refetch()}
            className="a-btn a-btn-sm"
            style={{ marginLeft: '12px' }}
            type="button"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="a-stat-grid">
        <div className="a-stat-card">
          <div className="a-stat-label">활성 스토리</div>
          <div className="a-stat-value">{formatNumber(stats?.stories.public ?? 0)}</div>
          <div className="a-stat-delta">↑ +2 이번 주</div>
        </div>
        <div className="a-stat-card">
          <div className="a-stat-label">총 세션</div>
          <div className="a-stat-value">{formatNumber(stats?.sessions.total ?? 0)}</div>
          <div className="a-stat-delta">↑ 오늘 {formatNumber(stats?.sessions.active_today ?? 0)}개</div>
        </div>
        <div className="a-stat-card">
          <div className="a-stat-label">오늘 API 호출</div>
          <div className="a-stat-value">{formatNumber(stats?.system.total_requests_today ?? 0)}</div>
          <div className="a-stat-delta">↑ +5.1% 어제 대비</div>
        </div>
        <div className="a-stat-card">
          <div className="a-stat-label">활성 사용자</div>
          <div className="a-stat-value">{formatNumber(stats?.users.active_today ?? 0)}</div>
          <div className="a-stat-delta down">
            오늘 활성 / 총 {formatNumber(stats?.users.total ?? 0)}명
          </div>
        </div>
      </div>

      {/* System status + API chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="a-card">
          <div className="a-card-header">
            <span className="a-card-title">시스템 상태</span>
          </div>
          <div className="a-card-body">
            <div className="a-status-row">
              <span className="a-status-label">Cloudflare Worker</span>
              <span className="a-badge a-badge-ok">
                <span className="a-status-dot" />정상
              </span>
            </div>
            <div className="a-status-row">
              <span className="a-status-label">Supabase DB</span>
              <span className="a-badge a-badge-ok">
                <span className="a-status-dot" />정상
              </span>
            </div>
            <div className="a-status-row">
              <span className="a-status-label">Gemini API</span>
              <span className="a-badge a-badge-ok">
                <span className="a-status-dot" />정상
              </span>
            </div>
            <div className="a-status-row">
              <span className="a-status-label">오류율 (24h)</span>
              <span className={`a-badge ${systemStatus.error_rate > 1 ? 'a-badge-warn' : 'a-badge-ok'}`}>
                <span className="a-status-dot" />
                {systemStatus.error_rate.toFixed(1)}%
              </span>
            </div>
            <div className="a-status-row">
              <span className="a-status-label">평균 응답시간</span>
              <span className="a-badge a-badge-info">
                {formatNumber(systemStatus.avg_response_ms)}ms
              </span>
            </div>
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-header">
            <span className="a-card-title">오늘 API 호출 추이</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--a-font-ui)', fontSize: '9px', color: 'var(--a-ink-faint)' }}>
              시간별
            </span>
          </div>
          <div className="a-card-body">
            <HourlyChart data={stats?.hourly_calls ?? []} />
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">최근 이벤트</span>
        </div>
        <div className="a-card-body" style={{ padding: 0 }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>유형</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_events ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--a-ink-faint)', fontFamily: 'var(--a-font-ui)', fontSize: '11px' }}>
                    최근 이벤트 없음
                  </td>
                </tr>
              ) : (
                (stats?.recent_events ?? []).map(event => (
                  <tr key={event.id}>
                    <td className="mono">{formatTime(event.timestamp)}</td>
                    <td>
                      <span className={eventBadgeClass(event.level)}>
                        {eventLevelLabel(event.level)}
                      </span>
                    </td>
                    <td>{event.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
