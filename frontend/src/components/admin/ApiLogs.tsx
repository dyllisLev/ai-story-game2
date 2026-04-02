import { type FC, type CSSProperties, type JSX } from 'react';
import { useAuth } from '@/lib/auth';
import { useApiLogs } from '../../hooks/useLogs';
import { ApiLogDetail } from './ApiLogDetail';
import { Pagination } from '../ui/Pagination';
import { formatTime } from '../../lib/format';
import { AdminTablePlaceholder } from './AdminTablePlaceholder';

/* ── Helpers ── */

function endpointBadgeStyle(endpoint: string): CSSProperties {
  switch (endpoint) {
    case 'game/chat':
      return { background: 'rgba(74,127,165,0.15)', border: '1px solid rgba(74,127,165,0.3)', color: '#7ab5d9' };
    case 'game/start':
      return { background: 'rgba(74,127,165,0.15)', border: '1px solid rgba(74,127,165,0.3)', color: '#7ab5d9' };
    case 'memory':
      return { background: 'rgba(143,186,138,0.12)', border: '1px solid rgba(143,186,138,0.3)', color: '#8fba8a' };
    default:
      return {};
  }
}

/* ── Main component ── */

export const ApiLogs: FC = () => {
  const { user } = useAuth();
  const {
    logs, totalPages, isLoading, refetch,
    filters, updateFilters,
    expandedId, toggleExpanded,
    clearLogs, isClearing,
  } = useApiLogs(user);

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">API 로그</div>
        <div className="a-section-subtitle">Gemini API 호출 로그 · 요청/응답 전문 포함</div>
      </div>

      <div className="a-card">
        {/* Filter bar */}
        <div className="a-filter-bar">
          <select
            className="a-filter-select"
            value={filters.endpoint ?? ''}
            onChange={e => updateFilters({ endpoint: e.target.value })}
          >
            <option value="">모든 엔드포인트</option>
            <option value="game/start">game/start</option>
            <option value="game/chat">game/chat</option>
            <option value="memory">memory</option>
          </select>

          <input
            className="a-filter-input"
            placeholder="세션ID 검색..."
            style={{ width: '160px' }}
            value={filters.session_id ?? ''}
            onChange={e => updateFilters({ session_id: e.target.value })}
          />

          <select
            className="a-filter-select"
            value={filters.time_range ?? '24h'}
            onChange={e => updateFilters({ time_range: e.target.value as typeof filters.time_range })}
          >
            <option value="1h">최근 1시간</option>
            <option value="6h">최근 6시간</option>
            <option value="24h">최근 24시간</option>
          </select>

          <button
            className={`a-filter-btn${filters.errors_only ? ' active' : ''}`}
            onClick={() => updateFilters({ errors_only: !filters.errors_only })}
            type="button"
          >
            오류만 보기
          </button>

          <button
            className="a-filter-btn"
            onClick={() => void refetch()}
            type="button"
          >
            새로고침
          </button>

          <button
            className="a-btn-danger"
            onClick={() => {
              if (window.confirm('API 로그를 모두 삭제하시겠습니까?')) clearLogs();
            }}
            disabled={isClearing}
            style={{ marginLeft: 'auto', fontSize: '9px', padding: '4px 10px' }}
            type="button"
          >
            로그 삭제
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="a-table">
            <thead>
              <tr>
                <th style={{ width: '20px' }} />
                <th>시간</th>
                <th>세션ID</th>
                <th>엔드포인트</th>
                <th>모델</th>
                <th>요청 토큰</th>
                <th>응답 토큰</th>
                <th>소요시간</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {(isLoading || logs.length === 0) ? (
                <AdminTablePlaceholder
                  colSpan={9}
                  isLoading={isLoading}
                  emptyMessage="로그 없음"
                />
              ) : (
                logs.flatMap(log => {
                  const isExpanded = expandedId === log.id;
                  return [
                    <tr
                      key={log.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleExpanded(log.id)}
                      className={isExpanded ? 'expanded' : ''}
                    >
                      <td>
                        <span className={`a-row-expander${isExpanded ? ' open' : ''}`}>▶</span>
                      </td>
                      <td className="mono">{formatTime(log.timestamp)}</td>
                      <td className="mono" style={{ color: 'var(--a-ink-accent)' }}>
                        {log.session_id.slice(0, 8)}
                      </td>
                      <td>
                        <span className="a-badge" style={endpointBadgeStyle(log.endpoint)}>
                          {log.endpoint}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '10px' }}>{log.model}</td>
                      <td className="mono">{log.input_tokens.toLocaleString('ko-KR')}</td>
                      <td className="mono">
                        {log.success ? log.output_tokens.toLocaleString('ko-KR') : '—'}
                      </td>
                      <td className="mono">{log.duration_ms.toLocaleString('ko-KR')}ms</td>
                      <td>
                        <span className={`a-badge ${log.success ? 'a-badge-ok' : 'a-badge-err'}`}>
                          {log.success ? '성공' : '오류'}
                        </span>
                      </td>
                    </tr>,
                    isExpanded ? (
                      <tr key={`${log.id}-expand`}>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <ApiLogDetail log={log} />
                        </td>
                      </tr>
                    ) : null,
                  ].filter((x): x is JSX.Element => x !== null);
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={filters.page}
          totalPages={totalPages}
          onPageChange={page => updateFilters({ page })}
          variant="admin"
        />
      </div>
    </div>
  );
};
