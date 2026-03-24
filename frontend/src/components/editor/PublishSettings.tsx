// components/editor/PublishSettings.tsx
// Public/private card select, password

import { type FC } from 'react';

interface PublishSettingsProps {
  isPublic: boolean;
  password: string;
  onPublicChange: (v: boolean) => void;
  onPasswordChange: (v: string) => void;
}

export const PublishSettings: FC<PublishSettingsProps> = ({
  isPublic,
  password,
  onPublicChange,
  onPasswordChange,
}) => {
  return (
    <section id="section-visibility" aria-labelledby="visibility-heading">
      <div className="section-header">
        <h2 id="visibility-heading" className="section-title">공개 설정</h2>
        <p className="section-desc">스토리 공개 여부와 접근 방식을 설정하세요.</p>
      </div>

      {/* Visibility option cards */}
      <div
        className="vis-options"
        role="radiogroup"
        aria-label="공개 여부 선택"
      >
        {/* Private */}
        <div
          className={`vis-option${!isPublic ? ' selected' : ''}`}
          onClick={() => onPublicChange(false)}
          role="radio"
          aria-checked={!isPublic}
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onPublicChange(false)}
        >
          <div className="vis-option-icon" style={{ background: 'var(--bg-input)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="vis-option-title">비공개</p>
          <p className="vis-option-desc">나만 접근 가능합니다</p>
        </div>

        {/* Public */}
        <div
          className={`vis-option${isPublic ? ' selected' : ''}`}
          onClick={() => onPublicChange(true)}
          role="radio"
          aria-checked={isPublic}
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onPublicChange(true)}
        >
          <div className="vis-option-icon" style={{ background: 'var(--bg-input)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <p className="vis-option-title">공개</p>
          <p className="vis-option-desc">누구나 목록에서 찾아 플레이할 수 있습니다</p>
        </div>
      </div>

      {/* Password (only shown when public) */}
      {isPublic && (
        <div className="form-group">
          <label className="form-label" htmlFor="storyPassword">
            비밀번호
            <span className="label-badge optional">선택</span>
          </label>
          <input
            id="storyPassword"
            type="password"
            className="form-input"
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            placeholder="설정 시 비밀번호가 있는 사람만 플레이 가능"
            autoComplete="new-password"
          />
          <p className="form-hint">비워두면 비밀번호 없이 누구나 접근 가능합니다.</p>
        </div>
      )}
    </section>
  );
};
