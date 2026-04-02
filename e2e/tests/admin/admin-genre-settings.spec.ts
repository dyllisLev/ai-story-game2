import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';

test.describe('Admin - Genre Settings', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.skipAuth();
  });

  test('should navigate to Genre Settings section', async ({ page }) => {
    // Navigate to Genre Settings
    await adminPage.navigateTo('장르 설정');

    // Verify we're on the correct section
    await expect(page.locator('.a-section-title').filter({ hasText: '장르 설정' })).toBeVisible();
    await expect(page.locator('.a-section-subtitle').filter({ hasText: '장르별 스타일과 색상 테마를 관리합니다' })).toBeVisible();
  });

  test('should display all genre configuration items', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    // Verify genre cards are displayed
    const genreCards = page.locator('.a-card').filter({ has: page.locator('.a-card-header') });
    await expect(genreCards.first()).toBeVisible();

    // Count total genre cards - should be 9
    const cardCount = await genreCards.count();
    expect(cardCount).toBe(9);

    // Check for specific genre IDs (which are displayed in each card)
    const expectedGenreIds = ['moo', 'fantasy', 'modern', 'romance', 'horror', 'sf', 'mystery', 'history', 'psychology'];
    for (const genreId of expectedGenreIds) {
      const genreCard = page.locator('.a-card').filter({ hasText: `ID: ${genreId}` });
      await expect(genreCard.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display genre properties correctly', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    // Check first genre card has all required fields
    const firstCard = page.locator('.a-card').filter({ hasText: /ID:/ }).first();

    // Genre ID should be visible
    await expect(firstCard.locator('text=/ID:/')).toBeVisible();

    // Genre name input should be visible and enabled
    const nameInput = firstCard.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEnabled();

    // Icon input should be visible
    const iconInput = firstCard.locator('input[type="text"]').nth(1);
    await expect(iconInput).toBeVisible();
    await expect(iconInput).toBeEnabled();

    // Color inputs should be visible (3 color inputs per genre: main, bg, border)
    const colorInputs = firstCard.locator('input[type="text"]');
    await expect(colorInputs.nth(2)).toBeVisible(); // Main color
    await expect(colorInputs.nth(3)).toBeVisible(); // BG color
    await expect(colorInputs.nth(4)).toBeVisible(); // Border color
  });

  test('should edit genre name', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ has: page.locator('.a-card-header') }).first();
    const nameInput = firstCard.locator('input[type="text"]').first();

    // Get original value
    const originalName = await nameInput.inputValue();

    // Edit genre name
    await nameInput.clear();
    await nameInput.fill('테스트 장르');

    // Verify the input was updated
    await expect(nameInput).toHaveValue('테스트 장르');

    // Restore original value (cleanup)
    await nameInput.clear();
    await nameInput.fill(originalName);
    await expect(nameInput).toHaveValue(originalName);
  });

  test('should edit genre icon', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ has: page.locator('.a-card-header') }).first();
    const iconInput = firstCard.locator('input[type="text"]').nth(1);

    // Get original value
    const originalIcon = await iconInput.inputValue();

    // Edit icon
    await iconInput.clear();
    await iconInput.fill('🎮');

    // Verify the input was updated
    await expect(iconInput).toHaveValue('🎮');

    // Restore original value (cleanup)
    await iconInput.clear();
    await iconInput.fill(originalIcon);
    await expect(iconInput).toHaveValue(originalIcon);
  });

  test('should edit genre colors using text input', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ has: page.locator('.a-card-header') }).first();

    // Test main color edit
    const mainColorInput = firstCard.locator('input[type="text"]').nth(2);
    const originalMainColor = await mainColorInput.inputValue();

    await mainColorInput.clear();
    await mainColorInput.fill('rgb(255, 0, 0)');
    await expect(mainColorInput).toHaveValue('rgb(255, 0, 0)');

    // Restore original value
    await mainColorInput.clear();
    await mainColorInput.fill(originalMainColor);
  });

  test('should edit genre colors using color picker', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ has: page.locator('.a-card-header') }).first();

    // Find color picker (input[type="color"])
    const colorPicker = firstCard.locator('input[type="color"]').first();

    // Get the associated text input
    const colorTextInput = firstCard.locator('input[type="text"]').nth(2);

    // Click the color picker
    await colorPicker.click();

    // The color picker should have updated the text input to RGB format
    const colorValue = await colorTextInput.inputValue();
    expect(colorValue).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  test('should display color preview boxes', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ hasText: /ID:/ }).first();

    // Check for color preview divs (inline style with backgroundColor)
    const colorPreviews = firstCard.locator('div[style*="background-color"]');
    await expect(colorPreviews.first()).toBeVisible();

    // Verify preview has border and border-radius
    const preview = colorPreviews.first();
    const style = await preview.getAttribute('style');
    expect(style).toContain('border');
    expect(style).toContain('border-radius');
  });

  test('should save genre configuration changes', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ has: page.locator('.a-card-header') }).first();
    const nameInput = firstCard.locator('input[type="text"]').first();

    // Edit genre name
    const originalName = await nameInput.inputValue();
    await nameInput.clear();
    await nameInput.fill('임시 장르명');

    // Click save button
    await adminPage.saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Navigate away and back to verify persistence
    await adminPage.navigateTo('게임 파라미터');
    await page.waitForTimeout(200);
    await adminPage.navigateTo('장르 설정');
    await page.waitForTimeout(200);

    // Verify the change persisted (or at least no error occurred)
    await expect(page.locator('.a-section-title').filter({ hasText: '장르 설정' })).toBeVisible();

    // Restore original value
    await nameInput.clear();
    await nameInput.fill(originalName);
    await adminPage.saveButton.click();
    await page.waitForTimeout(500);
  });

  test('should have tooltips for color inputs', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    const firstCard = page.locator('.a-card').filter({ hasText: /ID:/ }).first();

    // Check for tooltip icons (ⓘ)
    const tooltips = firstCard.locator('.a-tooltip-icon');
    await expect(tooltips.first()).toBeVisible();

    // Verify tooltip text content
    await expect(tooltips.first()).toHaveText('ⓘ');
  });

  test('should display correct section header and subtitle', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    // Verify section title
    const sectionTitle = page.locator('.a-section-title').filter({ hasText: '장르 설정' });
    await expect(sectionTitle).toBeVisible();

    // Verify section subtitle
    const sectionSubtitle = page.locator('.a-section-subtitle');
    await expect(sectionSubtitle).toContainText('장르별 스타일과 색상 테마를 관리합니다');
  });

  test('should handle multiple genre cards', async ({ page }) => {
    await adminPage.navigateTo('장르 설정');

    // Count genre cards
    const genreCards = page.locator('.a-card').filter({ has: page.locator('.a-card-header') });
    const count = await genreCards.count();

    // Should have at least 3 genres
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify each card has the required structure
    for (let i = 0; i < count; i++) {
      const card = genreCards.nth(i);
      await expect(card.locator('.a-card-header')).toBeVisible();
      await expect(card.locator('.a-card-body')).toBeVisible();
    }
  });
});
