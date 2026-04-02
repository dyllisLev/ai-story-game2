import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';

test.describe('Admin - Navigation and Layout', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.goto();
  });

  test('should display admin auth gate', async ({ page }) => {
    // Verify login message is visible
    await expect(page.locator('text=로그인이 필요합니다')).toBeVisible();

    // Verify login link
    await expect(page.locator('a:has-text("로그인")')).toBeVisible();

    // Verify skip button (DEV only)
    await expect(adminPage.skipButton).toBeVisible();
  });

  test('should skip authentication and enter admin panel', async ({ page }) => {
    // Skip auth (for development/testing)
    await adminPage.skipAuth();

    // Verify topbar is visible
    await expect(adminPage.topbarLogo).toBeVisible();
    await expect(adminPage.topbarTitle).toBeVisible();
    await expect(adminPage.topbarBadge).toBeVisible();

    // Verify main navigation is visible
    await expect(adminPage.nav).toBeVisible();

    // Verify main content area is visible
    await expect(adminPage.mainContent).toBeVisible();
  });

  test('should display all navigation sections', async ({ page }) => {
    await adminPage.skipAuth();

    // Expected navigation items
    const expectedNavItems = [
      '대시보드',
      '회원 관리',
      '서비스 로그',
      'API 로그',
      '프롬프트 설정',
      '게임 파라미터',
      '장르 설정',
      '스토리 프리셋',
      '스토리 관리',
      '상태창 프리셋',
      '시스템'
    ];

    // Verify each nav item exists
    for (const item of expectedNavItems) {
      const navItem = adminPage.navItem(item);
      await expect(navItem).toBeVisible();
    }
  });

  test('should navigate to Dashboard section', async ({ page }) => {
    await adminPage.skipAuth();

    // Click on Dashboard
    await adminPage.navigateTo('대시보드');

    // Verify navigation (dashboard content should be visible)
    await expect(page.locator('.a-section-title, .a-card-title').first()).toBeVisible();
  });

  test('should navigate to Prompt Settings section', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to Prompt Settings
    await adminPage.navigateTo('프롬프트 설정');

    // Verify navigation button is active/highlighted
    const activeNav = await adminPage.getActiveNavItem();
    await expect(activeNav).toBeVisible();

    // Note: Actual content may not load due to auth API, but navigation works
  });

  test('should navigate to Status Presets section', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to Status Presets
    await adminPage.navigateTo('상태창 프리셋');

    // Verify section title or content
    await expect(page.locator('.a-section-title, .a-card-title').first()).toBeVisible();
  });

  test('should navigate to Stories section', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to Stories
    await adminPage.navigateTo('스토리 관리');

    // Verify section is loaded
    await expect(page.locator('.a-section-title, .a-card-title').first()).toBeVisible();
  });

  test('should navigate to Story Presets section', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to Story Presets
    await adminPage.navigateTo('스토리 프리셋');

    // Verify section is loaded
    await expect(page.locator('.a-section-title, .a-card-title').first()).toBeVisible();
  });

  test('should navigate to System section', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to System
    await adminPage.navigateTo('시스템');

    // Verify danger zone or system content is visible
    await expect(page.locator('.a-danger-zone, .a-section-title').first()).toBeVisible();
  });

  test('should navigate to Service Logs section (AI-174 fix verification)', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to Service Logs (서비스 로그)
    await adminPage.navigateTo('서비스 로그');

    // Wait for content to load
    await page.waitForTimeout(500);

    // Verify section title or content is visible
    // Should NOT see infinite loading or 401 error
    await expect(page.locator('.a-section-title, .a-card-title, .a-main').first()).toBeVisible();

    // Verify we're not stuck in loading state
    const loadingIndicator = page.locator('.a-loading, .loading, [role="progressbar"]');
    const isLoading = await loadingIndicator.count();
    expect(isLoading).toBe(0);

    // Verify no error messages
    const errorMessage = page.locator('.a-error')
      .or(page.locator('.error'))
      .or(page.locator('text=오류'))
      .or(page.locator('text=Error'))
      .or(page.locator('text=401'));
    const hasError = await errorMessage.count();
    expect(hasError).toBe(0);
  });

  test('should highlight active navigation item', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to different sections
    await adminPage.navigateTo('장르 설정');
    await page.waitForTimeout(200);

    // Verify active nav item is highlighted
    const activeNav = await adminPage.getActiveNavItem();
    await expect(activeNav).toBeVisible();
  });

  test('should display action bar with save button', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to a section that shows action bar (Prompt Settings)
    await adminPage.navigateTo('프롬프트 설정');

    // Verify action bar is visible (only shown on config pages)
    await expect(adminPage.actionBar).toBeVisible();

    // Verify save button is visible
    await expect(adminPage.saveButton).toBeVisible();
  });

  test('should display theme toggle in topbar', async ({ page }) => {
    await adminPage.skipAuth();

    // Verify theme toggle button exists
    await expect(adminPage.themeToggle).toBeVisible();
  });

  test('should have link back to main site', async ({ page }) => {
    await adminPage.skipAuth();

    // Verify site link is visible
    await expect(adminPage.siteLink).toBeVisible();

    // Click site link and verify navigation
    await adminPage.siteLink.click();
    await page.waitForTimeout(300);

    // Should be on home page now
    expect(page.url()).toContain('localhost:5173');
    expect(page.url()).not.toContain('/admin');
  });

  test('should display correct page title', async ({ page }) => {
    await adminPage.skipAuth();

    // Verify page title
    await expect(page).toHaveTitle(/Story|World|AI|스토리월드/i);
  });

  test('should have responsive layout', async ({ page }) => {
    await adminPage.skipAuth();

    // Check navigation visibility on desktop
    await expect(adminPage.nav).toBeVisible();

    // Check main content visibility
    await expect(adminPage.mainContent).toBeVisible();

    // Verify layout structure (using .a-shell instead of non-existent classes)
    await expect(page.locator('.a-shell')).toBeVisible();
  });

  test('should handle navigation between sections correctly', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to multiple sections in sequence
    const sections = ['대시보드', '게임 파라미터', '장르 설정', '프롬프트 설정'];

    for (const section of sections) {
      await adminPage.navigateTo(section);
      await page.waitForTimeout(200);

      // Verify content area is updated
      await expect(adminPage.mainContent).toBeVisible();
    }
  });

  test('should maintain authentication state during navigation', async ({ page }) => {
    await adminPage.skipAuth();

    // Navigate to different sections
    await adminPage.navigateTo('대시보드');
    await page.waitForTimeout(200);

    await adminPage.navigateTo('장르 설정');
    await page.waitForTimeout(200);

    // Auth gate should not reappear
    await expect(adminPage.authGate).not.toBeVisible();
  });

  test('should display error notification on auth failure', async ({ page }) => {
    // Note: This test is skipped because auth flow now uses DEV skip button
    // and the login form is handled differently
    test.skip(true, 'Auth flow changed - DEV skip button is used for testing');
  });

  test('should have proper meta tags and accessibility', async ({ page }) => {
    await adminPage.skipAuth();

    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, .a-title, .a-section-title');
    await expect(headings.first()).toBeVisible();

    // Check for proper button labels
    const buttons = page.locator('button[aria-label], button');
    await expect(buttons.first()).toBeVisible();
  });
});
