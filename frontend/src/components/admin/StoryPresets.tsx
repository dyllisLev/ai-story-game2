import { type FC, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PresetEditModal, type StoryPreset } from './PresetEditModal';
import { genreClass } from '../../lib/genre';

/* ── Preset card ── */
interface PresetCardProps {
  preset: StoryPreset;
  onEdit: (p: StoryPreset) => void;
  onDelete: (id: string) => void;
}

const PresetCard: FC<PresetCardProps> = ({ preset, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  const detailFields: Array<{ key: string; value: string; single?: boolean; badge?: boolean }> = [
    { key: '제목',    value: preset.title,         single: true },
    { key: '시스템 규칙', value: preset.system_rules },
    { key: '세계관',  value: preset.world_setting },
    { key: '스토리',  value: preset.story },
    { key: '등장인물', value: preset.characters,   single: true },
    { key: 'LaTeX',   value: preset.use_latex ? '활성화' : '비활성화', badge: true },
  ].filter(f => f.value);

  return (
    <div className={`a-preset-card${open ? ' open' : ''}`}>
      <div className="a-preset-card-header" onClick={() => setOpen(o => !o)}>
        <span className="a-preset-expand-icon">▶</span>
        <span className={genreClass(preset.genre)}>{preset.genre || '—'}</span>
        <span className="a-preset-name">{preset.title}</span>
        <span className="a-preset-attr-count">{detailFields.length} 항목</span>
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
              if (preset.id && window.confirm(`"${preset.title}" 프리셋을 삭제하시겠습니까?`)) {
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
          <div className="a-preset-details-grid">
            {detailFields.map(f => (
              <div key={f.key} style={{ display: 'contents' }}>
                <div className="a-preset-detail-key">{f.key}</div>
                <div
                  className={`a-preset-detail-val${f.single ? ' single' : ''}${f.badge ? (preset.use_latex ? ' active-badge' : ' inactive-badge') : ''}`}
                >
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main component ── */

export const StoryPresets: FC = () => {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<StoryPreset | null | undefined>(undefined);
  // undefined = modal closed, null = new preset, StoryPreset = editing

  const { data: presets = [], isLoading } = useQuery<StoryPreset[]>({
    queryKey: ['admin', 'story-presets'],
    queryFn: () => api.get<StoryPreset[]>('/presets'),
    staleTime: 30_000,
  });

  const { data: statusPresets = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ['admin', 'status-presets-simple'],
    queryFn: () => api.get<Array<{ id: string; title: string }>>('/admin/status-presets?fields=id,title'),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (p: StoryPreset) =>
      p.id
        ? api.put(`/presets/${p.id}`, p)
        : api.post('/presets', p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'story-presets'] });
      setEditTarget(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/presets/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'story-presets'] }),
  });

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">스토리 프리셋</div>
        <div className="a-section-subtitle">에디터에서 선택할 수 있는 기본 스토리 템플릿 관리</div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--a-ink-muted)', fontFamily: 'var(--a-font-ui)', fontSize: '12px' }}>
          로딩 중...
        </div>
      ) : (
        <>
          <div className="a-preset-list">
            {presets.map(p => (
              <PresetCard
                key={p.id ?? p.title}
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
        <PresetEditModal
          preset={editTarget}
          statusPresets={statusPresets}
          onSave={p => saveMutation.mutate(p)}
          onClose={() => setEditTarget(undefined)}
        />
      )}
    </div>
  );
};
