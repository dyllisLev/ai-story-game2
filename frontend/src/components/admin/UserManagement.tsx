import { type FC, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface UserItem {
  id: string;
  email: string;
  nickname: string | null;
  role: 'pending' | 'user' | 'admin';
  created_at: string;
}

interface UsersResponse {
  data: UserItem[];
  total: number;
  page: number;
  total_pages: number;
}

const ROLE_LABELS: Record<string, string> = {
  pending: '대기',
  user: '회원',
  admin: '관리자',
};

const ROLE_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  user: '#6dbf87',
  admin: '#a78bfa',
};

export const UserManagement: FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (roleFilter) params.set('role', roleFilter);
      const res = await api.get<UsersResponse>(`/admin/users?${params}`);
      setUsers(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.show('계정이 삭제되었습니다', 'success');
      setDeleteConfirm(null);
      await fetchUsers();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = users.filter(u => u.role === 'pending').length;

  return (
    <div className="a-section">
      <div className="a-section-header">
        <h2 className="a-section-title">회원 관리</h2>
        <span className="a-section-subtitle">전체 {total}명</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'pending', 'user', 'admin'].map((r) => (
          <button
            key={r}
            className={`a-btn${roleFilter === r ? ' active' : ''}`}
            onClick={() => { setRoleFilter(r); setPage(1); }}
            type="button"
            style={{
              background: roleFilter === r ? 'var(--a-ink-accent)' : undefined,
              color: roleFilter === r ? '#0a0a0f' : undefined,
              position: 'relative',
            }}
          >
            {r === '' ? '전체' : ROLE_LABELS[r]}
            {r === 'pending' && pendingCount > 0 && (
              <span style={{
                marginLeft: 6,
                background: '#f59e0b',
                color: '#0a0a0f',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--a-ink-muted)' }}>
          로딩 중...
        </div>
      ) : users.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--a-ink-muted)' }}>
          {roleFilter ? `${ROLE_LABELS[roleFilter]} 상태인 회원이 없습니다` : '등록된 회원이 없습니다'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="a-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>이메일</th>
                <th style={thStyle}>닉네임</th>
                <th style={thStyle}>권한</th>
                <th style={thStyle}>가입일</th>
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--a-border-faint)' }}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13 }}>{u.email}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, color: u.nickname ? 'var(--a-ink-primary)' : 'var(--a-ink-muted)' }}>
                      {u.nickname || '-'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${ROLE_COLORS[u.role]}22`,
                      color: ROLE_COLORS[u.role],
                      border: `1px solid ${ROLE_COLORS[u.role]}44`,
                    }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: 'var(--a-ink-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.role === 'pending' && (
                        <button
                          className="a-btn"
                          onClick={() => { void handleRoleChange(u.id, 'user'); }}
                          disabled={actionLoading === u.id}
                          type="button"
                          style={{
                            fontSize: 11,
                            padding: '3px 10px',
                            background: '#6dbf8733',
                            color: '#6dbf87',
                            border: '1px solid #6dbf8744',
                          }}
                        >
                          {actionLoading === u.id ? '...' : '승인'}
                        </button>
                      )}
                      {u.role === 'user' && (
                        <>
                          <button
                            className="a-btn"
                            onClick={() => { void handleRoleChange(u.id, 'admin'); }}
                            disabled={actionLoading === u.id}
                            type="button"
                            style={{ fontSize: 11, padding: '3px 10px' }}
                          >
                            관리자로
                          </button>
                          <button
                            className="a-btn"
                            onClick={() => { void handleRoleChange(u.id, 'pending'); }}
                            disabled={actionLoading === u.id}
                            type="button"
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              color: 'var(--a-ink-muted)',
                            }}
                          >
                            비활성화
                          </button>
                        </>
                      )}
                      {u.role === 'admin' && (
                        <button
                          className="a-btn"
                          onClick={() => { void handleRoleChange(u.id, 'user'); }}
                          disabled={actionLoading === u.id}
                          type="button"
                          style={{ fontSize: 11, padding: '3px 10px' }}
                        >
                          회원으로
                        </button>
                      )}
                      {deleteConfirm === u.id ? (
                        <>
                          <button
                            className="a-btn"
                            onClick={() => { void handleDelete(u.id); }}
                            disabled={actionLoading === u.id}
                            type="button"
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              background: '#f43f5e33',
                              color: '#f43f5e',
                              border: '1px solid #f43f5e66',
                              fontWeight: 700,
                            }}
                          >
                            {actionLoading === u.id ? '...' : '정말 삭제'}
                          </button>
                          <button
                            className="a-btn"
                            onClick={() => setDeleteConfirm(null)}
                            type="button"
                            style={{ fontSize: 11, padding: '3px 10px', color: 'var(--a-ink-muted)' }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          className="a-btn"
                          onClick={() => setDeleteConfirm(u.id)}
                          type="button"
                          style={{
                            fontSize: 11,
                            padding: '3px 10px',
                            color: '#f43f5e',
                            border: '1px solid #f43f5e44',
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            className="a-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            type="button"
          >
            ← 이전
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--a-ink-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="a-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            type="button"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--a-ink-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--a-border-faint)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};
