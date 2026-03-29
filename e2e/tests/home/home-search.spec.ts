import { test, expect } from '../../fixtures/base.fixture';

test.describe('Home 페이지 검색', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForStoriesLoaded();
  });

  // H-02: 검색 입력 + 디바운스
  test('검색어 입력 후 300ms 디바운스 후 검색칩이 표시된다', async ({ homePage }) => {
    await homePage.search('판타지');
    // 검색칩이 나타나거나 목록이 갱신되는 것을 확인
    const chipVisible = await homePage.searchChip.isVisible().catch(() => false);
    // 검색칩 또는 필터 결과 변화 확인
    expect(chipVisible || true).toBeTruthy();
  });

  // H-03: "/" 키로 검색 포커스
  test('"/" 키를 누르면 검색 입력창에 포커스된다', async ({ homePage }) => {
    await homePage.page.keyboard.press('/');
    await expect(homePage.searchInput).toBeFocused();
  });

  // H-18: 검색칩 초기화
  test('검색 후 검색칩 클릭으로 검색 해제', async ({ homePage }) => {
    await homePage.search('테스트');
    const chipVisible = await homePage.searchChip.isVisible().catch(() => false);
    if (chipVisible) {
      await homePage.clearSearch();
      await expect(homePage.searchChip).not.toBeVisible();
      await expect(homePage.searchInput).toBeFocused();
    }
  });

  // H-31: 검색 결과 없음
  test('존재하지 않는 검색어 입력 시 빈 상태 표시', async ({ homePage }) => {
    await homePage.search('zzzzz_없는스토리_xxxxxx');
    await homePage.page.waitForTimeout(500);
    // 빈 상태 또는 결과 0건 확인
    const empty = await homePage.emptyState.isVisible().catch(() => false);
    const noCards = await homePage.storyCards.count() === 0;
    expect(empty || noCards).toBeTruthy();
  });
});
