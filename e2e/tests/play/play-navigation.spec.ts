import { test, expect } from '../../fixtures/base.fixture';
import { e2eConfig } from '../../config';

test.describe('Play 페이지 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    // Play 페이지로 이동
    await page.goto(e2eConfig.baseURL + '/play');
    // domcontentloaded만 대기 (networkidle은 타임아웃 가능성 높음)
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  });

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await expect(page).toHaveTitle(/Story|World|AI|스토리월드/i);
    await expect(page.locator('#playLayout')).toBeVisible({ timeout: 10000 });
  });

  test('세션 패널 토글 버튼이 작동한다', async ({ page }) => {
    const leftToggle = page.locator('.btn-icon').filter({ hasText: '☰' });
    await expect(leftToggle).toBeVisible({ timeout: 10000 });

    const sessionPanel = page.locator('.session-panel');

    // 패널 초기 상태 확인
    const initiallyVisible = await sessionPanel.isVisible({ timeout: 5000 }).catch(() => false);

    // 토글 버튼 클릭
    await leftToggle.click();
    await page.waitForTimeout(300);

    // 상태가 변경되었는지 확인
    const nowVisible = await sessionPanel.isVisible({ timeout: 2000 }).catch(() => false);
    expect(nowVisible).not.toBe(initiallyVisible);
  });

  test('정보 패널 토글 버튼이 작동한다', async ({ page }) => {
    const rightToggle = page.locator('.btn-icon').filter({ hasText: '⊞' });
    await expect(rightToggle).toBeVisible({ timeout: 10000 });

    const infoPanel = page.locator('.info-panel');

    // 패널 초기 상태 확인
    const initiallyVisible = await infoPanel.isVisible({ timeout: 5000 }).catch(() => false);

    // 토글 버튼 클릭
    await rightToggle.click();
    await page.waitForTimeout(300);

    // 상태가 변경되었는지 확인
    const nowVisible = await infoPanel.isVisible({ timeout: 2000 }).catch(() => false);
    expect(nowVisible).not.toBe(initiallyVisible);
  });

  test('테마 토글 버튼이 작동한다', async ({ page }) => {
    const themeToggle = page.locator('.btn-icon').filter({ hasText: /🌙|☀️/ });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });

    // 테마 전환 (단순히 버튼이 클릭 가능한지 확인)
    await themeToggle.click();
    await page.waitForTimeout(200);
    // 페이지가 깜빡이지 않고 정상 유지되는지 확인
    await expect(page.locator('#playLayout')).toBeVisible();
  });

  test('API 키 입력 필드가 존재한다', async ({ page }) => {
    const apiKeyInput = page.getByLabel('Gemini API 키 입력');
    await expect(apiKeyInput).toBeVisible({ timeout: 10000 });
  });

  test('AI 모델 선택 드롭다운이 존재한다', async ({ page }) => {
    const modelSelect = page.getByLabel('AI 모델 선택');
    await expect(modelSelect).toBeVisible({ timeout: 10000 });
  });

  test('입력 모드 버튼들이 존재한다', async ({ page }) => {
    await expect(page.locator('.input-toolbar-btn').filter({ hasText: /행동/ })).toBeVisible();
    await expect(page.locator('.input-toolbar-btn').filter({ hasText: /생각/ })).toBeVisible();
    await expect(page.locator('.input-toolbar-btn').filter({ hasText: /대사/ })).toBeVisible();
    await expect(page.locator('.input-toolbar-btn').filter({ hasText: /장면/ })).toBeVisible();
  });

  test('입력창이 존재한다', async ({ page }) => {
    const inputTextarea = page.getByLabel('입력창');
    await expect(inputTextarea).toBeVisible();
  });

  test('전송 버튼이 존재한다', async ({ page }) => {
    const sendButton = page.getByLabel('전송');
    await expect(sendButton).toBeVisible();
  });

  test('새 세션 시작 버튼이 작동한다', async ({ page }) => {
    const leftToggle = page.locator('.btn-icon').filter({ hasText: '☰' });
    await leftToggle.click();
    await page.waitForTimeout(500);

    const newSessionButton = page.getByLabel('새 세션 시작');
    await expect(newSessionButton).toBeVisible({ timeout: 5000 });
  });

  test('등장인물 버튼이 작동한다', async ({ page }) => {
    const charModalButton = page.locator('.btn-icon').filter({ hasText: '📒' });
    await expect(charModalButton).toBeVisible();

    // 모달 열기
    await charModalButton.click();
    await page.waitForTimeout(300);

    const charModal = page.locator('[role="dialog"][aria-label="등장인물"]');
    await expect(charModal).toBeVisible();

    // 모달 닫기
    const closeBtn = charModal.locator('.char-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(200);
    }
  });
});
