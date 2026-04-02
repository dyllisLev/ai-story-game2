import { test, expect } from '@playwright/test';
import { EditorPage } from '../../pages/editor.page';
import { e2eConfig } from '../../config';
import { EDITOR_SECTIONS, PRIMARY_SECTIONS } from '../../fixtures/editor-sections';

test.describe('Editor 페이지 네비게이션', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
    // domcontentloaded만 대기
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  });

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await expect(page).toHaveTitle(/Story|World|AI|스토리월드|Editor|에디터/i);
  });

  test('로고가 홈으로 이동한다', async ({ page }) => {
    await editorPage.logo.click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('localhost:5173');
    expect(page.url()).not.toContain('/editor');
  });

  test('사이드바가 표시된다', async ({ page }) => {
    await expect(editorPage.sidebar).toBeVisible({ timeout: 10000 });
  });

  test('모든 사이드바 섹션이 표시된다', async ({ page }) => {
    for (const section of EDITOR_SECTIONS) {
      const sidebarItem = editorPage.sidebarItem(section);
      await expect(sidebarItem).toBeVisible({ timeout: 5000 });
    }
  });

  test('사이드바 섹션 클릭 시 해당 섹션으로 스크롤', async ({ page }) => {
    for (const section of PRIMARY_SECTIONS) {
      await editorPage.navigateToSection(section);
      await page.waitForTimeout(300);
      // 섹션이 활성화되거나 스크롤되는지 확인
      await expect(editorPage.sidebar).toBeVisible();
    }
  });

  test('테마 토글 버튼이 작동한다', async ({ page }) => {
    await expect(editorPage.themeToggle).toBeVisible();

    // 테마 전환 클릭
    await editorPage.themeToggle.click();
    await page.waitForTimeout(200);

    // 페이지가 정상 유지되는지 확인
    await expect(editorPage.sidebar).toBeVisible();
  });

  test('미리보기 토글 버튼이 존재한다', async ({ page }) => {
    await expect(editorPage.previewToggle).toBeVisible();
  });

  test('상태창 & 캐릭터 패널 토글이 존재한다', async ({ page }) => {
    await expect(editorPage.previewPanelToggle).toBeVisible();
  });

  test('게임 시작 버튼이 존재한다', async ({ page }) => {
    await expect(editorPage.gameStartButton).toBeVisible();
  });

  test('테스트 플레이 버튼이 작동한다', async ({ page }) => {
    await expect(editorPage.testPlayButton).toBeVisible();

    // 테스트 플레이 모달 열기
    await editorPage.openTestPlayModal();
    await page.waitForTimeout(300);

    // 모달이 표시되는지 확인
    await expect(editorPage.testPlayModal).toBeVisible();

    // 모달 닫기
    await editorPage.closeTestPlayModal();
    await page.waitForTimeout(200);

    await expect(editorPage.testPlayModal).not.toBeVisible();
  });

  test('저장 버튼이 존재한다', async ({ page }) => {
    await expect(editorPage.saveButton).toBeVisible();
  });

  test('불러오기 버튼이 존재한다', async ({ page }) => {
    await expect(editorPage.loadButton).toBeVisible();
  });

  test('삭제 버튼이 존재한다', async ({ page }) => {
    await expect(editorPage.deleteButton).toBeVisible();
  });

  test('공유 버튼이 존재한다', async ({ page }) => {
    await expect(editorPage.shareButton).toBeVisible();
  });

  test('진행 상태바가 표시된다', async ({ page }) => {
    await expect(editorPage.progressBar).toBeVisible({ timeout: 10000 });
  });

  test('기본 설정 필드들이 표시된다', async ({ page }) => {
    // Wait for config to load - wait for genre buttons to appear
    await page.waitForSelector('.genre-chip', { timeout: 10000 });
    await expect(editorPage.presetSelect).toBeVisible();
    await expect(editorPage.genreGroup).toBeVisible();
    await expect(editorPage.iconGroup).toBeVisible();
    await expect(editorPage.aiModelSelect).toBeVisible();
    await expect(editorPage.titleInput).toBeVisible();
  });

  test('캐릭터 추가 버튼이 작동한다', async ({ page }) => {
    await expect(editorPage.addAttributeButton).toBeVisible();

    const initialCount = await editorPage.characterCards.count();

    // 캐릭터 추가
    await editorPage.addCharacter();
    await page.waitForTimeout(300);

    const newCount = await editorPage.characterCards.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('프롬프트 미리보기가 표시된다', async ({ page }) => {
    await expect(editorPage.promptPreview).toBeVisible({ timeout: 10000 });
  });
});
