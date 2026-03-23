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
      <div className="mb-7">
        <h2 id="visibility-heading" className="font-serif text-[22px] font-bold text-text-primary tracking-tight mb-1">
          공개 설정
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">스토리 공개 여부와 접근 방식을 설정하세요.</p>
      </div>

      {/* Visibility option cards */}
      <div
        className="grid grid-cols-2 gap-2.5 mb-4"
        role="radiogroup"
        aria-label="공개 여부 선택"
      >
        {/* Private */}
        <div
          className={[
            'p-4 rounded-[10px] border-2 cursor-pointer transition-all bg-[var(--bg-card)]',
            !isPublic ? 'border-accent bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:border-[var(--border-mid)]',
          ].join(' ')}
          onClick={() => onPublicChange(false)}
          role="radio"
          aria-checked={!isPublic}
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onPublicChange(false)}
        >
          <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--bg-input)] flex items-center justify-center mb-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-text-primary mb-0.5">비공개</p>
          <p className="text-[11px] text-text-muted leading-snug">나만 접근 가능합니다</p>
        </div>

        {/* Public */}
        <div
          className={[
            'p-4 rounded-[10px] border-2 cursor-pointer transition-all bg-[var(--bg-card)]',
            isPublic ? 'border-accent bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:border-[var(--border-mid)]',
          ].join(' ')}
          onClick={() => onPublicChange(true)}
          role="radio"
          aria-checked={isPublic}
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onPublicChange(true)}
        >
          <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--bg-input)] flex items-center justify-center mb-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-text-primary mb-0.5">공개</p>
          <p className="text-[11px] text-text-muted leading-snug">누구나 목록에서 찾아 플레이할 수 있습니다</p>
        </div>
      </div>

      {/* Password (only shown when public) */}
      {isPublic && (
        <div className="mb-5">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary mb-1.5" htmlFor="storyPassword">
            비밀번호
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--border)] text-text-muted">선택</span>
          </label>
          <input
            id="storyPassword"
            type="password"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-mid)] rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-sans outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--accent-dim)] placeholder:text-text-muted"
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            placeholder="설정 시 비밀번호가 있는 사람만 플레이 가능"
            autoComplete="new-password"
          />
          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
            비워두면 비밀번호 없이 누구나 접근 가능합니다.
          </p>
        </div>
      )}

      <div className="h-8" />
    </section>
  );
};
