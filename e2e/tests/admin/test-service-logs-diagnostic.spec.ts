import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin.page';

test('Service Logs diagnostic test', async ({ page }) => {
  const adminPage = new AdminPage(page);
  
  // Collect console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to admin
  await adminPage.goto();
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/admin-before-skip.png' });
  
  // Skip auth
  await adminPage.skipAuth();
  await page.waitForTimeout(500);
  
  // Take screenshot after auth skip
  await page.screenshot({ path: '/tmp/admin-after-skip.png' });
  
  // Click Service Logs menu
  await adminPage.navigateTo('서비스 로그');
  await page.waitForTimeout(1000);
  
  // Take screenshot after clicking service logs
  await page.screenshot({ path: '/tmp/admin-after-service-logs-click.png', fullPage: true });
  
  // Get page content
  const bodyText = await page.locator('body').textContent();
  console.log('Page content length:', bodyText?.length);
  console.log('Current URL:', page.url());
  console.log('Console errors:', consoleErrors);
  
  // Check what elements are visible
  const mainVisible = await page.locator('.a-main').isVisible();
  const navVisible = await page.locator('.a-nav').isVisible();
  const authGateVisible = await adminPage.authGate.isVisible();
  
  console.log('Main visible:', mainVisible);
  console.log('Nav visible:', navVisible);
  console.log('Auth gate visible:', authGateVisible);
  
  // Check for specific text
  const has401 = bodyText?.includes('401');
  const hasError = bodyText?.includes('오류');
  const hasUnauthorized = bodyText?.includes('Unauthorized');
  const hasServiceLogs = bodyText?.includes('서비스 로그') || bodyText?.includes('Service Logs');
  
  console.log('Has 401:', has401);
  console.log('Has error:', hasError);
  console.log('Has Unauthorized:', hasUnauthorized);
  console.log('Has Service Logs:', hasServiceLogs);
});
