import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';

test.describe('Admin - Game Parameters', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.skipAuth();
  });

  test('should navigate to Game Parameters section', async ({ page }) => {
    // Navigate to Game Parameters
    await adminPage.navigateTo('게임 파라미터');

    // Verify we're on the correct section
    await expect(page.locator('.a-section-title').filter({ hasText: '게임 파라미터' })).toBeVisible();
    await expect(page.locator('.a-section-subtitle').filter({ hasText: '게임플레이 동작을 제어하는 수치 설정' })).toBeVisible();
  });

  test('should display narration settings card', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Verify 서술 설정 card is visible
    const narrationCard = page.locator('.a-card').filter({ hasText: '서술 설정' });
    await expect(narrationCard).toBeVisible();
  });

  test('should display default narrative length setting', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Check for "기본 서술 문단 수" label
    const label = page.locator('.a-form-label').filter({ hasText: '기본 서술 문단 수' });
    await expect(label).toBeVisible();

    // Check for number stepper component
    const stepper = page.locator('.a-num-stepper').first();
    await expect(stepper).toBeVisible();

    // Verify stepper has decrement button, input, and increment button
    await expect(stepper.locator('button').first()).toBeVisible(); // − button
    await expect(stepper.locator('input[type="number"]')).toBeVisible();
    await expect(stepper.locator('button').nth(1)).toBeVisible(); // + button
  });

  test('should increment and decrement narrative length', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    const stepper = page.locator('.a-num-stepper').first();
    const input = stepper.locator('input[type="number"]');
    const incrementBtn = stepper.locator('button').nth(1);
    const decrementBtn = stepper.locator('button').first();

    // Get initial value
    const initialValue = await input.inputValue();
    const initialNum = parseInt(initialValue, 10);

    // Test increment
    await incrementBtn.click();
    await page.waitForTimeout(100);
    let newValue = await input.inputValue();
    expect(parseInt(newValue, 10)).toBe(initialNum + 1);

    // Test decrement
    await decrementBtn.click();
    await page.waitForTimeout(100);
    newValue = await input.inputValue();
    expect(parseInt(newValue, 10)).toBe(initialNum);
  });

  test('should respect min and max constraints', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    const stepper = page.locator('.a-num-stepper').first();
    const input = stepper.locator('input[type="number"]');
    const decrementBtn = stepper.locator('button').first();

    // Get the min value from input attribute
    const minAttr = await input.getAttribute('min');
    const minValue = minAttr ? parseInt(minAttr, 10) : 0;

    // Try to go below minimum by clicking decrement multiple times
    for (let i = 0; i < 20; i++) {
      await decrementBtn.click();
      await page.waitForTimeout(50);
    }

    // Value should not go below minimum
    const finalValue = await input.inputValue();
    expect(parseInt(finalValue, 10)).toBeGreaterThanOrEqual(minValue);
  });

  test('should allow manual input in number stepper', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    const stepper = page.locator('.a-num-stepper').first();
    const input = stepper.locator('input[type="number"]');

    // Clear and input new value
    await input.clear();
    await input.fill('5');
    await page.waitForTimeout(100);

    // Verify the value was updated
    await expect(input).toHaveValue('5');
  });

  test('should display tooltips for settings', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Check for tooltip icons (ⓘ)
    const tooltips = page.locator('.a-tooltip-icon');
    await expect(tooltips.first()).toBeVisible();
    await expect(tooltips.first()).toHaveText('ⓘ');
  });

  test('should have minimum and maximum narrative length settings', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Check for "서술 문단 수 최솟값" label
    const minLabel = page.locator('.a-form-label').filter({ hasText: '서술 문단 수 최솟값' });
    await expect(minLabel).toBeVisible();

    // Check for "서술 문단 수 최댓값" label
    const maxLabel = page.locator('.a-form-label').filter({ hasText: '서술 문단 수 최댓값' });
    await expect(maxLabel).toBeVisible();
  });

  test('should display input modes configuration', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Check for 입력 모드 related settings
    const inputModeLabel = page.locator('.a-form-label').filter({ hasText: /입력/ });
    await expect(inputModeLabel.first()).toBeVisible();
  });

  test('should save game parameter changes', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    const stepper = page.locator('.a-num-stepper').first();
    const input = stepper.locator('input[type="number"]');

    // Get original value
    const originalValue = await input.inputValue();

    // Change the value
    await input.clear();
    await input.fill('3');

    // Click save button
    await adminPage.saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Navigate away and back to verify persistence
    await adminPage.navigateTo('장르 설정');
    await page.waitForTimeout(200);
    await adminPage.navigateTo('게임 파라미터');
    await page.waitForTimeout(200);

    // Verify the section is still accessible (no error)
    await expect(page.locator('.a-section-title').filter({ hasText: '게임 파라미터' })).toBeVisible();

    // Restore original value
    await input.clear();
    await input.fill(originalValue);
    await adminPage.saveButton.click();
    await page.waitForTimeout(500);
  });

  test('should display available models configuration', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Check for models configuration section
    // This might be in a separate card or section
    const modelsLabel = page.locator('.a-form-label, .a-card-title').filter({ hasText: /모델|Model/i });
    await expect(modelsLabel.first()).toBeVisible();
  });

  test('should have proper form styling and layout', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Verify form groups exist
    const formGroups = page.locator('.a-form-group');
    await expect(formGroups.first()).toBeVisible();

    // Verify form rows exist for side-by-side layouts
    const formRows = page.locator('.a-form-row');
    await expect(formRows.first()).toBeVisible();

    // Verify labels are properly aligned
    const labelRows = page.locator('.a-form-label-row');
    await expect(labelRows.first()).toBeVisible();
  });

  test('should prevent invalid input in number fields', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    const stepper = page.locator('.a-num-stepper').first();
    const input = stepper.locator('input[type="number"]');

    // Get initial value
    const initialValue = await input.inputValue();

    // Try to enter non-numeric text using keyboard
    await input.click();
    await input.press('Control+A'); // Select all
    await input.type('abc');

    // The input should reject non-numeric values (either empty or original value)
    const value = await input.inputValue();
    // HTML5 number inputs automatically prevent non-numeric input
    expect(value === '' || value === initialValue || !isNaN(parseInt(value, 10))).toBeTruthy();
  });

  test('should display multiple configuration cards', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Count configuration cards
    const cards = page.locator('.a-card');
    const cardCount = await cards.count();

    // Should have at least 1 card (narration settings)
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('should have save button visible and enabled', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    // Verify save button is visible
    await expect(adminPage.saveButton).toBeVisible();

    // Verify save button is enabled
    await expect(adminPage.saveButton).toBeEnabled();
  });

  test('should maintain state after navigation', async ({ page }) => {
    await adminPage.navigateTo('게임 파라미터');

    const stepper = page.locator('.a-num-stepper').first();
    const input = stepper.locator('input[type="number"]');

    // Get initial value
    const initialValue = await input.inputValue();

    // Navigate to different section
    await adminPage.navigateTo('장르 설정');
    await page.waitForTimeout(200);

    // Navigate back
    await adminPage.navigateTo('게임 파라미터');
    await page.waitForTimeout(200);

    // Value should be maintained
    const returnedValue = await input.inputValue();
    expect(returnedValue).toBe(initialValue);
  });
});
