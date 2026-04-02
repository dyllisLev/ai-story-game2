import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';

/**
 * Bug Report: Service Logs Race Condition
 * 
 * Issue: When navigating to Service Logs after skipping auth, the API call
 * sometimes succeeds and sometimes fails with 401. This is a race condition
 * where the React Query fetch happens before the localStorage flag is fully
 * propagated to the API client.
 * 
 * Expected Behavior: After clicking "건너뛰기 (Dev)", all admin API calls
 * should include the x-dev-admin: skip header.
 * 
 * Actual Behavior: The first few API calls after auth skip may not include
 * the header, causing 401 errors and empty content.
 * 
 * Root Cause: The commit 357f190 removed the import.meta.env.DEV check,
 * but there's still a timing issue between setting localStorage and the
 * API client reading it.
 */
test('Service Logs - Race Condition Bug (AI-177)', async ({ page }) => {
  const adminPage = new AdminPage(page);
  
  // Track all console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to admin
  await adminPage.goto();
  await adminPage.skipAuth();
  
  // Wait longer to ensure localStorage is set
  await page.waitForTimeout(1000);
  
  // Navigate to Service Logs
  await adminPage.navigateTo('서비스 로그');
  await page.waitForTimeout(1000);
  
  // Check for errors
  console.log('Console errors:', errors);
  const has401 = errors.some(e => e.includes('401') || e.includes('Unauthorized'));
  
  // Check if content loaded
  const bodyText = await page.locator('body').textContent();
  const hasContent = bodyText && bodyText.length > 100;
  
  console.log('Has 401 errors:', has401);
  console.log('Page content length:', bodyText?.length);
  console.log('Has content:', hasContent);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/service-logs-race-condition.png', fullPage: true });
  
  // This test documents the bug - it may fail
  // The fix should ensure: no 401 errors AND content loads
  if (has401 || !hasContent) {
    console.log('BUG CONFIRMED: Race condition in dev bypass header');
  }
});
