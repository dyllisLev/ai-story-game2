import type { Page, Locator } from '@playwright/test';
import { e2eConfig } from '../config';

export class HomePage {
  readonly page: Page;

  // Header
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly themeToggle: Locator;
  readonly loginButton: Locator;
  readonly signupButton: Locator;

  // Hero
  readonly heroSection: Locator;
  readonly playStoriesButton: Locator;
  readonly createStoryLink: Locator;
  readonly statItems: Locator;

  // FilterBar
  readonly genreGroup: Locator;
  readonly sortSelect: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly searchChip: Locator;
  readonly storyCount: Locator;

  // Story Grid/List
  readonly storiesSection: Locator;
  readonly storyCards: Locator;
  readonly storyListRows: Locator;
  readonly loadingSkeleton: Locator;
  readonly emptyState: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly prevPageButton: Locator;
  readonly nextPageButton: Locator;

  // Featured
  readonly featuredSection: Locator;
  readonly featuredCards: Locator;

  // Footer
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.logo = page.getByLabel('스토리월드 홈');
    this.searchInput = page.getByLabel('스토리 검색');
    this.themeToggle = page.locator('header').getByRole('button').filter({ has: page.locator('svg') });
    this.loginButton = page.getByRole('link', { name: '로그인' });
    this.signupButton = page.getByRole('link', { name: '회원가입' });

    // Hero
    this.heroSection = page.locator('section').filter({ hasText: '당신만의 이야기를' });
    this.playStoriesButton = page.getByRole('link', { name: /스토리 플레이하기/ });
    this.createStoryLink = page.getByRole('link', { name: /새 스토리 만들기/ });
    this.statItems = page.getByLabel('서비스 통계');

    // FilterBar
    this.genreGroup = page.getByRole('group', { name: '장르 필터' });
    this.sortSelect = page.locator('#sortSelect');
    this.gridViewButton = page.getByLabel('그리드 보기');
    this.listViewButton = page.getByLabel('리스트 보기');
    this.searchChip = page.getByLabel('검색어 초기화');
    this.storyCount = page.locator('text=/\\d+개/').first();

    // Stories
    this.storiesSection = page.locator('#storiesSection');
    this.storyCards = page.locator('a[aria-label*="스토리 플레이"]');
    this.storyListRows = page.locator('a[aria-label*="스토리 플레이"]');
    this.loadingSkeleton = page.locator('[aria-busy="true"]');
    this.emptyState = page.locator('[aria-live="polite"]').filter({ hasText: /스토리|검색/ });

    // Pagination
    this.pagination = page.getByLabel('페이지 네비게이션');
    this.prevPageButton = page.getByLabel('이전 페이지');
    this.nextPageButton = page.getByLabel('다음 페이지');

    // Featured
    this.featuredSection = page.locator('section').filter({ hasText: '추천 스토리' });
    this.featuredCards = page.locator('a[aria-label*="추천 스토리"]');

    // Footer
    this.footer = page.locator('footer');
  }

  async goto() {
    await this.page.goto(e2eConfig.baseURL + '/');
    await this.page.waitForLoadState('networkidle');
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    // Wait for debounce (300ms)
    await this.page.waitForTimeout(400);
  }

  async clearSearch() {
    await this.searchChip.click();
  }

  genreChip(name: string) {
    return this.genreGroup.getByRole('button', { name });
  }

  async selectGenre(name: string) {
    await this.genreChip(name).click();
  }

  async selectSort(value: string) {
    await this.sortSelect.selectOption(value);
  }

  async toggleGridView() {
    await this.gridViewButton.click();
  }

  async toggleListView() {
    await this.listViewButton.click();
  }

  pageButton(pageNum: number) {
    return this.page.getByLabel(`${pageNum}페이지`);
  }

  async waitForStoriesLoaded() {
    await this.loadingSkeleton.first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
  }

  footerLink(name: string) {
    return this.footer.getByRole('link', { name });
  }
}
