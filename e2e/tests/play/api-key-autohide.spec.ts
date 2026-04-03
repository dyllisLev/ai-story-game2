import { test, expect } from '@playwright/test';
import { PlayPage } from '../../pages/play.page';

test.describe('Play Page - API Key Auto-Hide (AI-228)', () => {
  let playPage: PlayPage;

  test.beforeEach(async ({ page }) => {
    playPage = new PlayPage(page);
    await playPage.goto();
  });

  test('비로그인 사용자: API 키 입력란이 표시되어야 함', async ({ page }) => {
    // 비로그인 상태 확인 (사용자 아바타에 '?' 표시)
    const userAvatar = page.locator('.topbar-avatar');
    await expect(userAvatar).toContainText('?');

    // API 키 입력란이 표시되어야 함
    const apiKeyInput = page.locator('input.api-key-input');
    await expect(apiKeyInput).toBeVisible({ timeout: 10000 });

    // API 키 아이콘도 표시되어야 함
    const apiKeyIcon = page.locator('.api-key-icon');
    await expect(apiKeyIcon).toBeVisible();

    // 모델 선택도 표시되어야 함
    const modelSelect = page.locator('select.model-select');
    await expect(modelSelect).toBeVisible();
  });

  test('API 키 입력란 placeholder 확인', async ({ page }) => {
    // API 키 입력란의 placeholder를 확인
    const apiKeyInput = page.locator('input.api-key-input');
    await expect(apiKeyInput).toHaveAttribute('placeholder', 'Gemini API Key');
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
    await expect(apiKeyInput).toHaveAttribute('aria-label', 'Gemini API 키 입력');
  });

  test('모델 선택은 항상 표시되어야 함', async ({ page }) => {
    // 모델 선택 UI가 있는지 확인
    const modelSelect = page.locator('select.model-select');
    await expect(modelSelect).toBeVisible({ timeout: 10000 });
    await expect(modelSelect).toHaveAttribute('aria-label', 'AI 모델 선택');
  });

  test('모든 TopBar 액션 버튼이 표시되어야 함', async ({ page }) => {
    // 왼쪽 패널 토글 버튼
    const leftToggle = page.locator('button.btn-icon[aria-label="왼쪽 패널 토글"]');
    await expect(leftToggle).toBeVisible();

    // 등장인물 버튼
    const charButton = page.locator('button.btn-icon[aria-label="등장인물 보기"]');
    await expect(charButton).toBeVisible();

    // 오른쪽 패널 토글 버튼
    const rightToggle = page.locator('button.btn-icon[aria-label="오른쪽 패널 토글"]');
    await expect(rightToggle).toBeVisible();

    // 테마 전환 버튼
    const themeButton = page.locator('button.btn-icon[aria-label="테마 전환"]');
    await expect(themeButton).toBeVisible();
  });

  test.describe('로그인 사용자 시나리오 (수동 테스트 필요)', () => {
    test('로그인 + API 키 미등록: API 키 입력란 표시됨', async ({ page }) => {
      // NOTE: 이 테스트는 실제 인증 구현 후 자동화 가능
      // 현재는 수동 테스트가 필요합니다
      test.skip(true, 'Requires authentication implementation');

      // TODO: 실제 로그인 flow 구현 후 테스트 작성
      // 1. 로그인 수행
      // 2. API 키 미등록 상태 확인
      // 3. API 키 입력란이 표시되는지 확인
    });

    test('로그인 + API 키 등록됨: API 키 입력란 숨김', async ({ page }) => {
      // NOTE: 이 테스트는 실제 인증 구현 후 자동화 가능
      // 현재는 수동 테스트가 필요합니다
      test.skip(true, 'Requires authentication implementation');

      // TODO: 실제 로그인 flow 구현 후 테스트 작성
      // 1. 로그인 수행
      // 2. API 키 등록 상태로 설정
      // 3. API 키 입력란이 숨겨지는지 확인
      // 4. 모델 선택은 여전히 표시되는지 확인
    });
  });
});
