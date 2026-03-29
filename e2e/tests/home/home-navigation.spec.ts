import { test, expect } from '../../fixtures/base.fixture';

test.describe('Home 페이지 네비게이션', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForStoriesLoaded();
  });

  // H-22: 스토리 카드 클릭
  test('스토리 카드 클릭 시 /play/:storyId로 이동', async ({ homePage }) => {
    const cardCount = await homePage.storyCards.count();
    if (cardCount > 0) {
      const href = await homePage.storyCards.first().getAttribute('href');
      await homePage.storyCards.first().click();
      await expect(homePage.page).toHaveURL(/\/play\//);
    }
  });

  // H-07: 플레이 버튼으로 스크롤
  test('"스토리 플레이하기" 클릭 시 스토리 섹션으로 스크롤', async ({ homePage }) => {
    await homePage.playStoriesButton.click();
    await homePage.page.waitForTimeout(500);
    const isVisible = await homePage.storiesSection.isVisible();
    expect(isVisible).toBeTruthy();
  });

  // H-29: 관리자 링크
  test('푸터 "관리자" 링크 클릭 시 /admin으로 이동', async ({ homePage }) => {
    await homePage.footerLink('관리자').click();
    await expect(homePage.page).toHaveURL(/\/admin/);
  });

  // H-30: 에디터 링크
  test('푸터 "에디터" 링크 클릭 시 /editor로 이동', async ({ homePage }) => {
    await homePage.footerLink('에디터').click();
    await expect(homePage.page).toHaveURL(/\/editor/);
  });

  // H-25~H-28: 페이지네이션
  test('페이지네이션이 존재하면 동작한다', async ({ homePage }) => {
    const paginationVisible = await homePage.pagination.isVisible().catch(() => false);
    if (paginationVisible) {
      // 첫 페이지에서 이전 버튼 disabled
      await expect(homePage.prevPageButton).toBeDisabled();

      // 다음 페이지 클릭
      const nextEnabled = await homePage.nextPageButton.isEnabled().catch(() => false);
      if (nextEnabled) {
        await homePage.nextPageButton.click();
        await homePage.page.waitForTimeout(500);
        // 이전 버튼이 활성화
        await expect(homePage.prevPageButton).toBeEnabled();
      }
    }
  });
});
