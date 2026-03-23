import { type FC, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { StatusAttribute, StatusPreset } from '@story-game/shared';
import { genreClass } from '../../lib/genre';
import { GENRES } from '../../lib/constants';

/* ── Helpers ── */

function attrTypeLabel(type: StatusAttribute['type']): string {
  switch (type) {
    case 'number': return '수치바';
    case 'gauge':  return '게이지';
    case 'text':   return '텍스트';
    default:       return type;
  }
}

/* ── Preset card ── */
interface StatusPresetCardProps {
  preset: StatusPreset;
  onEdit: (p: StatusPreset) => void;
  onDelete: (id: string) => void;
}

const StatusPresetCard: FC<StatusPresetCardProps> = ({ preset, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`a-preset-card${open ? ' open' : ''}`}>
      <div className="a-preset-card-header" onClick={() => setOpen(o => !o)}>
        <span className="a-preset-expand-icon">▶</span>
        <span className={genreClass(preset.genre)}>{preset.genre || '—'}</span>
        <span className="a-preset-name">{preset.title}</span>
        <span className="a-preset-attr-count">{preset.attributes.length} 속성</span>
        <div
          className="a-preset-actions"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="a-btn a-btn-sm"
            onClick={() => onEdit(preset)}
            type="button"
          >
            편집
          </button>
          <button
            className="a-btn-danger"
            onClick={() => {
              if (window.confirm(`"${preset.title}" 프리셋을 삭제하시겠습니까?`)) {
                onDelete(preset.id);
              }
            }}
            style={{ fontSize: '9px', padding: '4px 10px' }}
            type="button"
          >
            삭제
          </button>
        </div>
      </div>

      {open && (
        <div className="a-preset-body">
          <table className="a-attr-table">
            <thead>
              <tr>
                <th>속성명</th>
                <th>타입</th>
                <th>세부 설정</th>
              </tr>
            </thead>
            <tbody>
              {preset.attributes.map((attr, i) => (
                <tr key={i}>
                  <td className="a-attr-name">{attr.name}</td>
                  <td>
                    <span className="a-attr-type-tag">{attrTypeLabel(attr.type)}</span>
                  </td>
                  <td className="mono" style={{ fontSize: '11px' }}>
                    {attr.max_value != null ? `max: ${attr.max_value}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ── Edit Modal ── */
interface EditModalProps {
  preset: StatusPreset | null;
  onSave: (p: Partial<StatusPreset>) => void;
  onClose: () => void;
}

const BLANK: Omit<StatusPreset, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  genre: '',
  attributes: [],
};

const StatusPresetEditModal: FC<EditModalProps> = ({ preset, onSave, onClose }) => {
  const [form, setForm] = useState(preset ?? BLANK);
  const [newAttr, setNewAttr] = useState<StatusAttribute>({ name: '', type: 'text' });

  const addAttr = () => {
    if (!newAttr.name.trim()) return;
    setForm(prev => ({ ...prev, attributes: [...prev.attributes, newAttr] }));
    setNewAttr({ name: '', type: 'text' });
  };

  const removeAttr = (i: number) => {
    setForm(prev => ({ ...prev, attributes: prev.attributes.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="a-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="a-modal">
        <div className="a-modal-header">
          <span className="a-modal-title">
            {preset ? `프리셋 편집 — ${preset.title}` : '새 상태창 프리셋'}
          </span>
          <button className="a-modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="a-modal-body">
          <div className="a-form-row">
            <div className="a-form-group">
              <label className="a-form-label">제목</label>
              <input
                className="a-form-control"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="a-form-group">
              <label className="a-form-label">장르</label>
              <select
                className="a-form-control"
                value={form.genre}
                onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
              >
                <option value="">선택...</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Attribute list */}
          <div style={{ marginBottom: '16px' }}>
            <div className="a-form-label" style={{ marginBottom: '8px' }}>속성 목록</div>
            <table className="a-attr-table" style={{ marginBottom: '12px' }}>
              <thead>
                <tr><th>속성명</th><th>타입</th><th>최댓값</th><th /></tr>
              </thead>
              <tbody>
                {form.attributes.map((attr, i) => (
                  <tr key={i}>
                    <td className="a-attr-name">{attr.name}</td>
                    <td><span className="a-attr-type-tag">{attrTypeLabel(attr.type)}</span></td>
                    <td className="mono" style={{ fontSize: '11px' }}>
                      {attr.max_value ?? '—'}
                    </td>
                    <td>
                      <button
                        className="a-btn-danger"
                        onClick={() => removeAttr(i)}
                        style={{ fontSize: '9px', padding: '2px 8px' }}
                        type="button"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add attribute row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div className="a-form-label" style={{ marginBottom: '4px' }}>속성명</div>
                <input
                  className="a-form-control"
                  value={newAttr.name}
                  onChange={e => setNewAttr(p => ({ ...p, name: e.target.value }))}
                  placeholder="속성명..."
                />
              </div>
              <div>
                <div className="a-form-label" style={{ marginBottom: '4px' }}>타입</div>
                <select
                  className="a-form-control"
                  value={newAttr.type}
                  onChange={e => setNewAttr(p => ({ ...p, type: e.target.value as StatusAttribute['type'] }))}
                >
                  <option value="text">텍스트</option>
                  <option value="number">수치바</option>
                  <option value="gauge">게이지</option>
                </select>
              </div>
              {(newAttr.type === 'number' || newAttr.type === 'gauge') && (
                <div>
                  <div className="a-form-label" style={{ marginBottom: '4px' }}>최댓값</div>
                  <input
                    className="a-form-control"
                    type="number"
                    style={{ width: '80px' }}
                    value={newAttr.max_value ?? ''}
                    onChange={e => setNewAttr(p => ({ ...p, max_value: Number(e.target.value) || undefined }))}
                  />
                </div>
              )}
              <button
                className="a-btn-save"
                onClick={addAttr}
                disabled={!newAttr.name.trim()}
                style={{ padding: '9px 16px', flexShrink: 0 }}
                type="button"
              >
                추가
              </button>
            </div>
          </div>
        </div>

        <div className="a-modal-footer">
          <button className="a-btn" onClick={onClose} type="button">취소</button>
          <button
            className="a-btn-save"
            onClick={() => onSave(form)}
            disabled={!form.title.trim()}
            type="button"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main component ── */

export const StatusPresets: FC = () => {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<StatusPreset | null | undefined>(undefined);

  const { data: presets = [], isLoading } = useQuery<StatusPreset[]>({
    queryKey: ['admin', 'status-presets'],
    queryFn: () => api.get<StatusPreset[]>('/admin/status-presets'),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (p: Partial<StatusPreset>) =>
      p.id
        ? api.put(`/admin/status-presets/${p.id}`, p)
        : api.post('/admin/status-presets', p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'status-presets'] });
      setEditTarget(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/status-presets/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'status-presets'] }),
  });

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">상태창 프리셋</div>
        <div className="a-section-subtitle">장르별 캐릭터 상태창 속성 정의 — 게임 생성 시 선택 가능</div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--a-ink-muted)', fontFamily: 'var(--a-font-ui)', fontSize: '12px' }}>
          로딩 중...
        </div>
      ) : (
        <>
          <div className="a-preset-list">
            {presets.map(p => (
              <StatusPresetCard
                key={p.id}
                preset={p}
                onEdit={setEditTarget}
                onDelete={id => deleteMutation.mutate(id)}
              />
            ))}
            {presets.length === 0 && (
              <div style={{ color: 'var(--a-ink-faint)', fontFamily: 'var(--a-font-ui)', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
                프리셋 없음
              </div>
            )}
          </div>

          <button
            className="a-btn-new-preset"
            onClick={() => setEditTarget(null)}
            type="button"
          >
            + 새 프리셋 추가
          </button>
        </>
      )}

      {editTarget !== undefined && (
        <StatusPresetEditModal
          preset={editTarget}
          onSave={p => saveMutation.mutate(p)}
          onClose={() => setEditTarget(undefined)}
        />
      )}
    </div>
  );
};
