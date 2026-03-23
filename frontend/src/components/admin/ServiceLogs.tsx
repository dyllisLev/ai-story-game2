import { type FC } from 'react';
import { useServiceLogs } from '../../hooks/useLogs';
import { Pagination } from '../ui/Pagination';
import { formatTime } from '../../lib/format';
import { AdminTablePlaceholder } from './AdminTablePlaceholder';

/* ── Helpers ── */

function methodColor(method: string): string {
  switch (method) {
    case 'GET':    return '#7ab5d9';
    case 'POST':   return '#c49a3c';
    case 'PUT':
    case 'PATCH':  return '#8fba8a';
    case 'DELETE': return '#e05040';
    default:       return 'var(--a-ink-muted)';
  }
}

function statusClass(code: number): string {
  if (code >= 500) return 'http-5xx';
  if (code >= 400) return 'http-4xx';
  return 'http-2xx';
}

/* ── Main component ── */

export const ServiceLogs: FC = () => {
  const {
    logs, totalPages, isLoading, refetch,
    filters, updateFilters, clearLogs, isClearing,
  } = useServiceLogs();

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">서비스 로그</div>
        <div className="a-section-subtitle">HTTP 요청 로그 · 실시간 업데이트</div>
      </div>

      <div className="a-card">
        {/* Filter bar */}
        <div className="a-filter-bar">
          <select
            className="a-filter-select"
            value={filters.status ?? ''}
            onChange={e => updateFilters({ status: e.target.value as typeof filters.status })}
          >
            <option value="">모든 상태코드</option>
            <option value="2xx">2xx 성공</option>
            <option value="4xx">4xx 클라이언트 오류</option>
            <option value="5xx">5xx 서버 오류</option>
          </select>

          <select
            className="a-filter-select"
            value={filters.path ?? ''}
            onChange={e => updateFilters({ path: e.target.value })}
          >
            <option value="">모든 경로</option>
            <option value="/api/config">/api/config</option>
            <option value="/api/game/start">/api/game/start</option>
            <option value="/api/game/chat">/api/game/chat</option>
            <option value="/api/memory">/api/memory</option>
            <option value="/api/stories">/api/stories</option>
          </select>

          <select
            className="a-filter-select"
            value={filters.time_range ?? '24h'}
            onChange={e => updateFilters({ time_range: e.target.value as typeof filters.time_range })}
          >
            <option value="1h">최근 1시간</option>
            <option value="6h">최근 6시간</option>
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
          </select>

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
              if (window.confirm('서비스 로그를 모두 삭제하시겠습니까?')) {
                clearLogs();
              }
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
                <th>시간</th>
                <th>메서드</th>
                <th>경로</th>
                <th>상태</th>
                <th>응답시간</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {(isLoading || logs.length === 0) ? (
                <AdminTablePlaceholder
                  colSpan={6}
                  isLoading={isLoading}
                  emptyMessage="로그 없음"
                />
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td className="mono">{formatTime(log.timestamp)}</td>
                    <td>
                      <span style={{ color: methodColor(log.method), fontFamily: 'var(--a-font-ui)', fontSize: '10px' }}>
                        {log.method}
                      </span>
                    </td>
                    <td className="mono">{log.path}</td>
                    <td>
                      <span className={statusClass(log.status_code)}>{log.status_code}</span>
                    </td>
                    <td className="mono">{log.response_time_ms.toLocaleString('ko-KR')}ms</td>
                    <td className="mono">{log.ip}</td>
                  </tr>
                ))
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
