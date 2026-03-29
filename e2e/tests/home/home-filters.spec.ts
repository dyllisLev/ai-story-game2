import { test, expect } from '../../fixtures/base.fixture';

test.describe('Home 페이지 필터', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForStoriesLoaded();
  });

  // H-15: 장르칩 클릭
  test('장르칩 클릭 시 aria-pressed가 true로 변경된다', async ({ homePage }) => {
    const chip = homePage.genreChip('판타지');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  // H-16: 전체 장르칩
  test('"전체" 칩 클릭 시 다른 장르칩은 비활성', async ({ homePage }) => {
    // 먼저 다른 장르 선택
    await homePage.selectGenre('판타지');
    await expect(homePage.genreChip('판타지')).toHaveAttribute('aria-pressed', 'true');

    // 전체 선택
    await homePage.selectGenre('전체');
    await expect(homePage.genreChip('전체')).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.genreChip('판타지')).toHaveAttribute('aria-pressed', 'false');
  });

  // H-17: 장르 전환
  test('다른 장르칩 연속 클릭 시 이전 칩은 비활성화', async ({ homePage }) => {
    await homePage.selectGenre('무협');
    await expect(homePage.genreChip('무협')).toHaveAttribute('aria-pressed', 'true');

    await homePage.selectGenre('공포');
    await expect(homePage.genreChip('공포')).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.genreChip('무협')).toHaveAttribute('aria-pressed', 'false');
  });

  // H-19: 정렬 변경
  test('정렬 드롭다운 변경 시 옵션이 적용된다', async ({ homePage }) => {
    await homePage.selectSort('popular');
    await expect(homePage.sortSelect).toHaveValue('popular');

    await homePage.selectSort('name');
    await expect(homePage.sortSelect).toHaveValue('name');
  });

  // H-20, H-21: 뷰 모드 토글
  test('그리드/리스트 뷰 토글', async ({ homePage }) => {
    // 그리드 뷰 확인
    await homePage.toggleGridView();
    await expect(homePage.gridViewButton).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.listViewButton).toHaveAttribute('aria-pressed', 'false');

    // 리스트 뷰 전환
    await homePage.toggleListView();
    await expect(homePage.listViewButton).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.gridViewButton).toHaveAttribute('aria-pressed', 'false');
  });
});
