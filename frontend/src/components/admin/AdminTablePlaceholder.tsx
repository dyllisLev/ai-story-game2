// components/admin/AdminTablePlaceholder.tsx
// Shared loading/empty state row for admin tables

import { type FC } from 'react';

interface AdminTablePlaceholderProps {
  /** Number of columns to span */
  colSpan: number;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Message shown when empty (not loading) */
  emptyMessage?: string;
}

export const AdminTablePlaceholder: FC<AdminTablePlaceholderProps> = ({
  colSpan,
  isLoading,
  emptyMessage = '데이터 없음',
}) => (
  <tr>
    <td
      colSpan={colSpan}
      style={{
        textAlign: 'center',
        color: 'var(--a-ink-faint)',
        fontFamily: 'var(--a-font-ui)',
        fontSize: '11px',
        padding: '16px',
      }}
    >
      {isLoading ? '로딩 중...' : emptyMessage}
    </td>
  </tr>
);
