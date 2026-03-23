import { type FC } from 'react';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { DangerZone } from './DangerZone';

export const SystemSection: FC = () => {
  const { stats, isLoading } = useAdminDashboard();

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">시스템</div>
        <div className="a-section-subtitle">배포 정보 · 상태 요약 · 위험 구역</div>
      </div>

      {/* Deploy info */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">배포 정보</span>
        </div>
        <div className="a-card-body">
          <div className="a-sys-grid">
            <div className="a-sys-item">
              <div className="a-sys-label">플랫폼</div>
              <div className="a-sys-value">Cloudflare Workers</div>
            </div>
            <div className="a-sys-item">
              <div className="a-sys-label">데이터베이스</div>
              <div className="a-sys-value">Supabase (PostgreSQL)</div>
            </div>
            <div className="a-sys-item">
              <div className="a-sys-label">AI 엔진</div>
              <div className="a-sys-value">Google Gemini 2.5 Flash</div>
            </div>
            <div className="a-sys-item">
              <div className="a-sys-label">빌드 일시</div>
              <div className="a-sys-value" style={{ fontFamily: 'var(--a-font-ui)', fontSize: '11px' }}>
                {new Date().toISOString().slice(0, 10)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="a-card">
        <div className="a-card-header">
          <span className="a-card-title">상태 요약</span>
        </div>
        <div className="a-card-body" style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '18px', color: 'var(--a-ink-faint)', fontFamily: 'var(--a-font-ui)', fontSize: '11px' }}>
              로딩 중...
            </div>
          ) : (
            <table className="a-table">
              <thead>
                <tr><th>항목</th><th>값</th><th>상태</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>총 스토리</td>
                  <td className="mono">{(stats?.stories.total ?? 0).toLocaleString('ko-KR')}</td>
                  <td><span className="a-badge a-badge-ok"><span className="a-status-dot" />정상</span></td>
                </tr>
                <tr>
                  <td>공개 스토리</td>
                  <td className="mono">{(stats?.stories.public ?? 0).toLocaleString('ko-KR')}</td>
                  <td><span className="a-badge a-badge-ok"><span className="a-status-dot" />정상</span></td>
                </tr>
                <tr>
                  <td>총 세션</td>
                  <td className="mono">{(stats?.sessions.total ?? 0).toLocaleString('ko-KR')}</td>
                  <td><span className="a-badge a-badge-ok"><span className="a-status-dot" />정상</span></td>
                </tr>
                <tr>
                  <td>오류율 (24h)</td>
                  <td className="mono">{(stats?.system.error_rate_24h ?? 0).toFixed(2)}%</td>
                  <td>
                    <span className={`a-badge ${(stats?.system.error_rate_24h ?? 0) > 1 ? 'a-badge-warn' : 'a-badge-ok'}`}>
                      <span className="a-status-dot" />
                      {(stats?.system.error_rate_24h ?? 0) > 1 ? '주의' : '정상'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>평균 응답시간</td>
                  <td className="mono">{(stats?.system.avg_response_ms ?? 0).toLocaleString('ko-KR')}ms</td>
                  <td>
                    <span className={`a-badge ${(stats?.system.avg_response_ms ?? 0) > 5000 ? 'a-badge-warn' : 'a-badge-ok'}`}>
                      <span className="a-status-dot" />
                      {(stats?.system.avg_response_ms ?? 0) > 5000 ? '느림' : '정상'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <DangerZone />
    </div>
  );
};
