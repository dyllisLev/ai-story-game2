/**
 * Editor section label constants for E2E tests
 *
 * These match the NAV_ITEMS labels defined in:
 * frontend/src/components/editor/EditorSidebar.tsx
 */

export const EDITOR_SECTIONS = [
  '기본 설정',
  '시스템 규칙',
  '세계관',
  '스토리',
  '등장인물',
  '상태창 설정',
  '출력 설정',
  '공개 설정'
] as const;

export const PRIMARY_SECTIONS = [
  '기본 설정',
  '세계관',
  '등장인물',
  '상태창 설정'
] as const;
