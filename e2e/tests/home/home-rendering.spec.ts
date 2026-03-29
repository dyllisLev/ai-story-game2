import { test, expect } from '../../fixtures/base.fixture';

test.describe('Home 페이지 렌더링', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  // H-01: 로고
  test('로고 "스토리월드"가 표시되고 클릭하면 홈으로 이동', async ({ homePage }) => {
    await expect(homePage.logo).toBeVisible();
    await homePage.logo.click();
    await expect(homePage.page).toHaveURL('/');
  });

  // H-02: 검색 입력창
  test('검색 입력창이 표시된다', async ({ homePage }) => {
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.searchInput).toHaveAttribute('placeholder', /스토리 제목/);
  });

  // H-04: 테마 토글
  test('테마 토글 버튼이 존재한다', async ({ homePage }) => {
    const themeButtons = homePage.page.locator('header button[aria-label*="모드로 전환"]');
    await expect(themeButtons.first()).toBeVisible();
  });

  // H-07: 히어로 섹션
  test('히어로 섹션이 CTA 버튼과 함께 표시된다', async ({ homePage }) => {
    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.playStoriesButton).toBeVisible();
    await expect(homePage.createStoryLink).toBeVisible();
  });

  // H-08: 새 스토리 만들기 링크
  test('"새 스토리 만들기" 클릭 시 /editor로 이동', async ({ homePage }) => {
    await homePage.createStoryLink.click();
    await expect(homePage.page).toHaveURL(/\/editor/);
  });

  // H-09: 통계 표시
  test('히어로 섹션에 통계 영역이 존재한다', async ({ homePage }) => {
    await expect(homePage.statItems).toBeVisible();
  });

  // H-15, H-16: 필터바
  test('필터바에 장르 칩, 정렬 드롭다운, 뷰 토글이 표시된다', async ({ homePage }) => {
    await expect(homePage.genreGroup).toBeVisible();
    await expect(homePage.sortSelect).toBeVisible();
    await expect(homePage.gridViewButton).toBeVisible();
    await expect(homePage.listViewButton).toBeVisible();
  });

  // H-32: 로딩 상태 또는 스토리 목록
  test('페이지 로드 후 스토리 목록 또는 빈 상태가 표시된다', async ({ homePage }) => {
    await homePage.waitForStoriesLoaded();
    const hasStories = await homePage.storyCards.count() > 0;
    const hasEmpty = await homePage.emptyState.isVisible().catch(() => false);
    expect(hasStories || hasEmpty).toBeTruthy();
  });

  // H-29, H-30: 푸터 링크
  test('푸터에 관리자, 에디터 링크가 존재한다', async ({ homePage }) => {
    await expect(homePage.footerLink('관리자')).toBeVisible();
    await expect(homePage.footerLink('에디터')).toBeVisible();
  });
});
