// components/editor/StatusSettings.tsx
// Toggle, preset chips, attribute table with drag-and-drop

import { type FC, useRef } from 'react';
import type { StatusAttribute } from '../../hooks/useStoryEditor';
import type { StatusPreset } from '@story-game/shared';
import { useConfig } from '@/hooks/useConfig';
import { generateId } from '@/lib/format';

interface StatusSettingsProps {
  enabled: boolean;
  attributes: StatusAttribute[];
  statusPresets: StatusPreset[];
  onToggle: (v: boolean) => void;
  onAddAttribute: () => void;
  onUpdateAttribute: (id: string, updates: Partial<StatusAttribute>) => void;
  onRemoveAttribute: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onApplyPreset: (attrs: StatusAttribute[]) => void;
}


export const StatusSettings: FC<StatusSettingsProps> = ({
  enabled,
  attributes,
  statusPresets,
  onToggle,
  onAddAttribute,
  onUpdateAttribute,
  onRemoveAttribute,
  onReorder,
  onApplyPreset,
}) => {
  const { data: config } = useConfig();
  const typeOptions = (config?.gameplayConfig.status_attribute_types ?? []).map(t => ({
    value: t.id as StatusAttribute['type'],
    label: t.label,
  }));

  const dragIndexRef = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    onReorder(dragIndexRef.current, index);
    dragIndexRef.current = index;
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
  };

  const handleStatusPreset = (preset: StatusPreset) => {
    const attrs: StatusAttribute[] = preset.attributes.map(a => ({
      id: generateId(),
      name: a.name,
      type: a.type === 'gauge' ? 'bar' : a.type === 'number' ? 'number' : 'text',
      max: a.max_value != null ? String(a.max_value) : '',
    }));
    onApplyPreset(attrs);
  };

  return (
    <section id="section-status" aria-labelledby="status-heading">
      <div className="section-header">
        <h2 id="status-heading" className="section-title">상태창 설정</h2>
        <p className="section-desc">플레이어의 스탯과 상태를 표시할 상태창을 구성하세요.</p>
      </div>

      {/* Enable toggle */}
      <div className="form-group">
        <div
          className="toggle-row"
          onClick={() => onToggle(!enabled)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? onToggle(!enabled) : undefined}
          aria-pressed={enabled}
        >
          <div className="toggle-row-info">
            <p className="toggle-label">상태창 사용</p>
            <p className="toggle-desc">게임 플레이 화면에 캐릭터 상태창을 표시합니다</p>
          </div>
          <label className="toggle-switch" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => onToggle(e.target.checked)}
              aria-label="상태창 사용"
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Config area */}
      <div
        style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? undefined : 'none' }}
        aria-hidden={!enabled}
      >
        {/* Preset chips */}
        <div className="form-group">
          <p className="form-label">프리셋 선택</p>
          <div className="status-presets">
            {statusPresets.map(p => (
              <button
                key={p.id}
                className="preset-chip"
                onClick={() => handleStatusPreset(p)}
              >
                {p.title}
              </button>
            ))}
            <button
              className="preset-chip custom"
              onClick={() => onApplyPreset([])}
            >
              ✏️ 직접 만들기
            </button>
          </div>
          <p className="form-hint">
            프리셋을 선택하면 기본 속성이 채워집니다. 이후 자유롭게 수정·추가·삭제할 수 있습니다.
          </p>
        </div>

        {/* Attribute table */}
        <div className="form-group">
          <p className="form-label">속성 목록</p>

          {/* Header row */}
          <div className="status-attrs-header">
            <span>속성 이름</span>
            <span>타입</span>
            <span>최대값</span>
            <span />
            <span />
          </div>

          {/* Attribute rows */}
          <div role="list" aria-label="상태 속성 목록">
            {attributes.map((attr, i) => (
              <div
                key={attr.id}
                className="attr-row"
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                role="listitem"
                aria-label={`속성: ${attr.name || '(빈 이름)'}`}
              >
                <input
                  className="attr-input"
                  value={attr.name}
                  onChange={e => onUpdateAttribute(attr.id, { name: e.target.value })}
                  placeholder="속성 이름"
                  aria-label="속성 이름"
                />
                <select
                  className="attr-select"
                  value={attr.type}
                  onChange={e => onUpdateAttribute(attr.id, { type: e.target.value as StatusAttribute['type'] })}
                  aria-label="타입"
                >
                  {typeOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="attr-max"
                  value={attr.max}
                  onChange={e => onUpdateAttribute(attr.id, { max: e.target.value })}
                  disabled={attr.type !== 'bar' && attr.type !== 'percent'}
                  placeholder="최대값"
                  aria-label="최대값"
                />
                {/* Delete */}
                <button
                  className="attr-btn delete"
                  onClick={() => onRemoveAttribute(attr.id)}
                  aria-label={`${attr.name || '속성'} 삭제`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
                {/* Drag handle */}
                <button
                  className="attr-btn drag"
                  aria-label="순서 변경 (드래그)"
                  tabIndex={-1}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add attribute button */}
          <button
            className="btn-dashed"
            style={{ marginTop: '8px' }}
            onClick={onAddAttribute}
            aria-label="속성 추가"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            속성 추가
          </button>

          {/* Hint */}
          <div className="attrs-hint">
            프리셋의 속성을 자유롭게 수정할 수 있습니다. 이름 변경, 타입 변경, 최대값 조정 모두 가능합니다. 드래그(≡)로 순서를 바꿀 수 있습니다.
          </div>
        </div>
      </div>
    </section>
  );
};
