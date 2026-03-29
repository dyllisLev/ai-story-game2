import { test, expect } from '../../fixtures/base.fixture';

test.describe('Play 페이지 렌더링', () => {
  test.beforeEach(async ({ playPage }) => {
    await playPage.goto();
  });

  // P-01: API Key 입력
  test('API Key 입력 필드가 password 타입으로 표시된다', async ({ playPage }) => {
    await expect(playPage.apiKeyInput).toBeVisible();
    await expect(playPage.apiKeyInput).toHaveAttribute('type', 'password');
  });

  // P-03: 모델 드롭다운 (API 키 없을 때)
  test('API 키 없을 때 모델 드롭다운이 비활성화된다', async ({ playPage }) => {
    await expect(playPage.modelSelect).toBeDisabled();
  });

  // P-04, P-06: 패널 토글 버튼
  test('좌우 패널 토글 버튼이 표시된다', async ({ playPage }) => {
    await expect(playPage.leftPanelToggle).toBeVisible();
    await expect(playPage.rightPanelToggle).toBeVisible();
  });

  // P-05: 캐릭터 모달 버튼
  test('캐릭터 모달 버튼이 표시된다', async ({ playPage }) => {
    await expect(playPage.charModalButton).toBeVisible();
  });

  // P-07: 테마 토글
  test('테마 토글 버튼이 표시된다', async ({ playPage }) => {
    await expect(playPage.themeToggle).toBeVisible();
  });

  // P-16~P-19: 입력 모드 버튼
  test('4개 입력 모드 버튼이 표시된다 (행동, 생각, 대사, 장면 지시)', async ({ playPage }) => {
    await expect(playPage.actionModeButton).toBeVisible();
    await expect(playPage.thoughtModeButton).toBeVisible();
    await expect(playPage.dialogueModeButton).toBeVisible();
    await expect(playPage.sceneModeButton).toBeVisible();
  });

  // P-20: 입력 텍스트에어리어
  test('입력 텍스트에어리어가 표시된다', async ({ playPage }) => {
    await expect(playPage.inputTextarea).toBeVisible();
  });

  // P-22: 전송 버튼
  test('전송 버튼이 표시된다', async ({ playPage }) => {
    await expect(playPage.sendButton).toBeVisible();
  });

  // P-30: 빈 상태 메시지
  test('게임 시작 전 안내 메시지가 표시된다', async ({ playPage }) => {
    await expect(playPage.emptyContentMessage).toBeVisible();
  });

  // P-08: 새 세션 시작 버튼
  test('새 세션 시작 버튼이 표시된다', async ({ playPage }) => {
    await expect(playPage.newSessionButton).toBeVisible();
  });

  // P-42~P-45: 정보 패널 탭
  test('정보 패널에 4개 탭이 표시된다', async ({ playPage }) => {
    await expect(playPage.infoTab).toBeVisible();
    await expect(playPage.memoryTab).toBeVisible();
    await expect(playPage.notesTab).toBeVisible();
    await expect(playPage.outputTab).toBeVisible();
  });
});
