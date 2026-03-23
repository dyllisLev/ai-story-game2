// components/editor/EditorSidebar.tsx
// 8 nav items with scroll highlight, completeness progress

import { type FC, type ReactNode } from 'react';

export type SectionId = 'basic' | 'rules' | 'world' | 'story' | 'chars' | 'status' | 'output' | 'visibility';

interface NavItem {
  id: SectionId;
  label: string;
  icon: ReactNode;
  iconBg: string;
  badge?: 'new' | 'done';
}


const NAV_ITEMS: NavItem[] = [
  {
    id: 'basic',
    label: '기본 설정',
    iconBg: 'bg-[var(--accent-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    id: 'rules',
    label: '시스템 규칙',
    iconBg: 'bg-[var(--rose-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" aria-hidden="true">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: 'world',
    label: '세계관',
    iconBg: 'bg-[var(--purple-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    id: 'story',
    label: '스토리',
    iconBg: 'bg-[var(--accent-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    id: 'chars',
    label: '등장인물',
    iconBg: 'bg-[var(--purple-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: 'status',
    label: '상태창 설정',
    iconBg: 'bg-[var(--purple-dim)]',
    badge: 'new',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h1v6H9z" /><path d="M12 6h1v9h-1z" /><path d="M15 11h1v4h-1z" />
      </svg>
    ),
  },
  {
    id: 'output',
    label: '출력 설정',
    iconBg: 'bg-[var(--accent-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: 'visibility',
    label: '공개 설정',
    iconBg: 'bg-[var(--green-dim)]',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
];

interface EditorSidebarProps {
  activeSection: SectionId;
  completeness: number;
  onNavigate: (id: SectionId) => void;
}

export const EditorSidebar: FC<EditorSidebarProps> = ({ activeSection, completeness, onNavigate }) => {
  return (
    <nav
      className="w-[220px] bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col overflow-hidden flex-shrink-0"
      aria-label="섹션 네비게이션"
    >
      <div className="flex-1 overflow-y-auto py-3 px-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-2 py-2 pb-1">
          스토리 구성
        </p>

        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={[
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] cursor-pointer text-[13px] transition-all border text-left relative',
                isActive
                  ? 'bg-[var(--bg-card)] border-[var(--border-mid)] text-text-primary'
                  : 'border-transparent text-text-secondary hover:bg-[var(--bg-card)] hover:text-text-primary',
              ].join(' ')}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'location' : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-[7px] bottom-[7px] w-0.5 bg-accent rounded-[0_2px_2px_0]"
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <span className={`w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                {item.icon}
              </span>

              {/* Label */}
              <span className="flex-1 font-sans">{item.label}</span>

              {/* Badge */}
              {item.badge === 'new' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--purple-dim)] text-purple font-semibold flex-shrink-0">
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Completeness progress */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
          <span>완성도</span>
          <span>{completeness}%</span>
        </div>
        <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-purple rounded-full transition-all duration-500"
            style={{ width: `${completeness}%` }}
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="스토리 완성도"
          />
        </div>
      </div>
    </nav>
  );
};
