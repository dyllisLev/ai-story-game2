import type { Page, Locator } from '@playwright/test';

export class AdminPage {
  readonly page: Page;

  // Auth Gate
  readonly authGate: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly skipButton: Locator;
  readonly authError: Locator;

  // TopBar
  readonly topbarLogo: Locator;
  readonly topbarTitle: Locator;
  readonly topbarBadge: Locator;
  readonly themeToggle: Locator;
  readonly siteLink: Locator;

  // Navigation
  readonly nav: Locator;

  // Main Content
  readonly mainContent: Locator;

  // Action Bar
  readonly actionBar: Locator;
  readonly saveButton: Locator;

  // Dashboard
  readonly refreshButton: Locator;

  // Danger Zone
  readonly dangerZone: Locator;

  constructor(page: Page) {
    this.page = page;

    // Auth Gate
    this.authGate = page.locator('.a-auth-gate');
    this.usernameInput = page.locator('input[autocomplete="username"]');
    this.passwordInput = page.locator('.a-auth-gate input[type="password"]');
    this.loginButton = page.locator('.a-auth-gate button').filter({ hasText: '로그인' });
    this.skipButton = page.locator('button, a').filter({ hasText: '건너뛰기' });
    this.authError = page.locator('.a-auth-error');

    // TopBar
    this.topbarLogo = page.locator('.a-topbar-logo');
    this.topbarTitle = page.locator('text=관리자 패널');
    this.topbarBadge = page.locator('text=Admin').first();
    this.themeToggle = page.locator('.a-topbar button').filter({ hasText: /라이트|다크/ });
    this.siteLink = page.locator('a').filter({ hasText: '사이트로' });

    // Navigation
    this.nav = page.locator('.a-nav');

    // Main Content
    this.mainContent = page.locator('.a-main');

    // Action Bar
    this.actionBar = page.locator('.a-action-bar');
    this.saveButton = page.locator('.a-btn-save');

    // Dashboard
    this.refreshButton = page.locator('button').filter({ hasText: '새로고침' });

    // Danger Zone
    this.dangerZone = page.locator('.a-danger-zone, section').filter({ hasText: '위험' });
  }

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  async skipAuth() {
    await this.skipButton.click();
    await this.page.waitForTimeout(300);
  }

  async loginWith(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  navItem(label: string) {
    return this.nav.locator('.a-nav-item, button').filter({ hasText: label });
  }

  async navigateTo(section: string) {
    await this.navItem(section).click();
    await this.page.waitForTimeout(200);
  }

  async getActiveNavItem() {
    return this.nav.locator('.a-nav-item.active');
  }

  // Prompt Settings
  textarea(label: string) {
    return this.mainContent.locator('textarea').filter({ hasText: label });
  }

  // Game Params
  numberInput(label: string) {
    return this.mainContent.locator('label, .a-label').filter({ hasText: label }).locator('..').locator('input[type="number"]');
  }

  // Preset cards
  presetCards() {
    return this.mainContent.locator('.a-preset-card, .a-card').filter({ has: this.page.locator('button') });
  }

  // Story Management table
  storyTable() {
    return this.mainContent.locator('table');
  }

  // Confirm dialog
  confirmDialog() {
    return this.page.locator('.a-confirm-dialog, [role="dialog"]').filter({ hasText: '위험한 작업' });
  }

  confirmDialogCancel() {
    return this.confirmDialog().locator('button').filter({ hasText: '취소' });
  }

  confirmDialogConfirm() {
    return this.confirmDialog().locator('button.danger, button').filter({ hasText: /초기화|삭제/ });
  }
}
