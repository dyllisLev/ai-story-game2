import { type FC, useState, useEffect } from 'react';
import type { GenreConfig } from '../../hooks/useAdminConfig';

interface GenreSettingsProps {
  config: GenreConfig;
  onChange: (config: GenreConfig) => void;
}

interface GenreStyle {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

/* ── Tooltip helper ── */
const Tooltip: FC<{ text: string }> = ({ text }) => (
  <div className="a-tooltip-wrap">
    <span className="a-tooltip-icon">ⓘ</span>
    <div className="a-tooltip-box">{text}</div>
  </div>
);

/* ── Color input with preview ── */
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

const ColorInput: FC<ColorInputProps> = ({ label, value, onChange }) => (
  <div className="a-form-group">
    <div className="a-form-label-row">
      <label className="a-form-label">{label}</label>
    </div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input
        className="a-form-control"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, fontFamily: 'monospace' }}
      />
      <input
        type="color"
        value={value.replace('rgba(', 'rgb(').replace(/,\s*[\d.]+\)$/, ')')}
        onChange={e => {
          // Convert hex to rgba for the text input
          const hex = e.target.value;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          onChange(`rgb(${r}, ${g}, ${b})`);
        }}
        style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid var(--a-border)' }}
      />
      <div
        style={{
          width: '36px',
          height: '36px',
          backgroundColor: value,
          border: '1px solid var(--a-border)',
          borderRadius: '4px'
        }}
      />
    </div>
  </div>
);

/* ── Single genre editor ── */
interface GenreEditorProps {
  genre: GenreStyle;
  onChange: (genre: GenreStyle) => void;
}

const GenreEditor: FC<GenreEditorProps> = ({ genre, onChange }) => {
  const update = <K extends keyof GenreStyle>(key: K, value: GenreStyle[K]) => {
    onChange({ ...genre, [key]: value });
  };

  return (
    <div className="a-card" style={{ marginBottom: '16px' }}>
      <div className="a-card-header">
        <span className="a-card-title">
          <span style={{ marginRight: '8px' }}>{genre.icon}</span>
          <input
            className="a-form-control"
            type="text"
            value={genre.name}
            onChange={e => update('name', e.target.value)}
            style={{ display: 'inline-block', width: '200px', fontSize: '14px', fontWeight: 600 }}
          />
        </span>
        <span style={{ fontSize: '12px', color: 'var(--a-ink-faint)', marginLeft: 'auto' }}>
          ID: {genre.id}
        </span>
      </div>
      <div className="a-card-body">
        <div className="a-form-row">
          <div className="a-form-group">
            <div className="a-form-label-row">
              <label className="a-form-label">아이콘</label>
            </div>
            <input
              className="a-form-control"
              type="text"
              value={genre.icon}
              onChange={e => update('icon', e.target.value)}
              style={{ width: '80px', textAlign: 'center', fontSize: '18px' }}
            />
          </div>
        </div>
        <ColorInput label="메인 색상" value={genre.color} onChange={v => update('color', v)} />
        <ColorInput label="배경 색상" value={genre.bgColor} onChange={v => update('bgColor', v)} />
        <ColorInput label="테두리 색상" value={genre.borderColor} onChange={v => update('borderColor', v)} />
      </div>
    </div>
  );
};

export const GenreSettings: FC<GenreSettingsProps> = ({ config, onChange }) => {
  const [local, setLocal] = useState<GenreConfig>(config);

  useEffect(() => {
    setLocal(config);
  }, [config]);

  const updateGenre = (index: number, genre: GenreStyle) => {
    const next = {
      ...local,
      genres: [...local.genres],
    };
    next.genres[index] = genre;
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="a-section">
      <div className="a-section-header">
        <div className="a-section-title">장르 설정</div>
        <div className="a-section-subtitle">장르별 스타일과 색상 테마를 관리합니다</div>
      </div>

      {local.genres.map((genre, index) => (
        <GenreEditor
          key={genre.id}
          genre={genre}
          onChange={g => updateGenre(index, g)}
        />
      ))}
    </div>
  );
};
