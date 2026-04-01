import type { Page, Locator } from '@playwright/test';
import { e2eConfig } from '../config';

export class EditorPage {
  readonly page: Page;

  // Header
  readonly logo: Locator;
  readonly saveStatus: Locator;
  readonly previewToggle: Locator;
  readonly previewPanelToggle: Locator;
  readonly themeToggle: Locator;

  // Sidebar
  readonly sidebar: Locator;
  readonly progressBar: Locator;

  // Basic Settings
  readonly presetSelect: Locator;
  readonly genreGroup: Locator;
  readonly iconGroup: Locator;
  readonly aiModelSelect: Locator;
  readonly titleInput: Locator;

  // Textarea sections
  readonly systemRulesTextarea: Locator;
  readonly worldDescTextarea: Locator;
  readonly mainStoryTextarea: Locator;

  // Characters
  readonly addCharacterButton: Locator;
  readonly characterCards: Locator;

  // Status Settings
  readonly statusToggle: Locator;
  readonly statusPresetChips: Locator;
  readonly addAttributeButton: Locator;
  readonly attributeRows: Locator;

  // Output Settings
  readonly narrativeDecrement: Locator;
  readonly narrativeIncrement: Locator;
  readonly latexToggle: Locator;
  readonly cacheToggle: Locator;

  // Publish Settings
  readonly privateOption: Locator;
  readonly publicOption: Locator;
  readonly passwordInput: Locator;

  // Action Bar
  readonly gameStartButton: Locator;
  readonly testPlayButton: Locator;
  readonly saveButton: Locator;
  readonly loadButton: Locator;
  readonly deleteButton: Locator;
  readonly shareButton: Locator;
  readonly lastSavedTime: Locator;

  // Test Play Modal
  readonly testPlayModal: Locator;
  readonly testPlayCloseButton: Locator;
  readonly testPlayBanner: Locator;

  // Prompt Preview
  readonly promptPreview: Locator;

  // Sections
  readonly sectionBasic: Locator;
  readonly sectionRules: Locator;
  readonly sectionWorld: Locator;
  readonly sectionStory: Locator;
  readonly sectionChars: Locator;
  readonly sectionStatus: Locator;
  readonly sectionOutput: Locator;
  readonly sectionVisibility: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.logo = page.getByLabel('홈으로');
    this.saveStatus = page.locator('[aria-live="polite"]').first();
    this.previewToggle = page.locator('button').filter({ hasText: '미리보기' });
    this.previewPanelToggle = page.getByLabel('상태창 & 캐릭터 패널');
    this.themeToggle = page.locator('button[aria-label*="모드로 전환"]');

    // Sidebar
    this.sidebar = page.locator('.editor-sidebar, nav').filter({ has: page.locator('text=기본 설정') });
    this.progressBar = page.locator('[role="progressbar"]');

    // Basic Settings
    this.presetSelect = page.locator('#presetSelect');
    this.genreGroup = page.getByRole('group', { name: '장르 선택' });
    this.iconGroup = page.getByRole('group', { name: '아이콘 선택' });
    this.aiModelSelect = page.locator('#aiModelSelect');
    this.titleInput = page.locator('#storyTitle');

    // Textareas
    this.systemRulesTextarea = page.locator('#systemRules');
    this.worldDescTextarea = page.locator('#worldDesc');
    this.mainStoryTextarea = page.locator('#mainStory');

    // Characters
    this.addCharacterButton = page.getByLabel('캐릭터 추가');
    this.characterCards = page.locator('.char-card');

    // Status
    this.statusToggle = page.locator('#section-status [aria-pressed]').first();
    this.statusPresetChips = page.locator('#section-status button').filter({ hasText: /무협|판타지|현대|직접/ });
    this.addAttributeButton = page.getByLabel('속성 추가');
    this.attributeRows = page.locator('[role="listitem"][aria-label*="속성"]');

    // Output
    this.narrativeDecrement = page.getByLabel('문단 수 줄이기');
    this.narrativeIncrement = page.getByLabel('문단 수 늘리기');
    this.latexToggle = page.locator('#latexToggle');
    this.cacheToggle = page.locator('#cacheToggle');

    // Publish
    this.privateOption = page.locator('[role="radio"]').filter({ hasText: '비공개' });
    this.publicOption = page.locator('[role="radio"]').filter({ hasText: '공개' });
    this.passwordInput = page.locator('#storyPassword');

    // Action Bar
    this.gameStartButton = page.getByLabel('게임 시작');
    this.testPlayButton = page.getByLabel('테스트 플레이');
    this.saveButton = page.getByLabel('저장').last();
    this.loadButton = page.getByLabel('불러오기');
    this.deleteButton = page.getByLabel('삭제');
    this.shareButton = page.getByLabel('공유');
    this.lastSavedTime = page.locator('[aria-live="polite"]').filter({ hasText: /저장/ });

    // Test Play Modal
    this.testPlayModal = page.locator('.test-play-overlay');
    this.testPlayCloseButton = page.locator('.test-play-icon-btn.close');
    this.testPlayBanner = page.locator('.test-play-banner');

    // Prompt Preview
    this.promptPreview = page.locator('[aria-label="프롬프트 미리보기"]');

    // Sections
    this.sectionBasic = page.locator('#section-basic');
    this.sectionRules = page.locator('#section-rules');
    this.sectionWorld = page.locator('#section-world');
    this.sectionStory = page.locator('#section-story');
    this.sectionChars = page.locator('#section-chars');
    this.sectionStatus = page.locator('#section-status');
    this.sectionOutput = page.locator('#section-output');
    this.sectionVisibility = page.locator('#section-visibility');
  }

  async goto(storyId?: string) {
    const path = storyId ? `/editor/${storyId}` : '/editor';
    await this.page.goto(e2eConfig.baseURL + path);
    await this.page.waitForLoadState('networkidle');
  }

  sidebarItem(label: string) {
    return this.sidebar.locator('button, a').filter({ hasText: label });
  }

  async navigateToSection(label: string) {
    await this.sidebarItem(label).click();
  }

  async setTitle(text: string) {
    await this.titleInput.fill(text);
  }

  async setSystemRules(text: string) {
    await this.systemRulesTextarea.fill(text);
  }

  async setWorldSetting(text: string) {
    await this.worldDescTextarea.fill(text);
  }

  async setStory(text: string) {
    await this.mainStoryTextarea.fill(text);
  }

  async addCharacter() {
    await this.addCharacterButton.click();
  }

  charCardHeader(index: number) {
    return this.characterCards.nth(index).locator('.char-card-header');
  }

  charField(charIndex: number, fieldId: string) {
    return this.characterCards.nth(charIndex).locator(`#${fieldId}`);
  }

  charCounter(textareaId: string) {
    const counterMap: Record<string, string> = {
      systemRules: 'rules-count',
      worldDesc: 'world-count',
      mainStory: 'story-count',
    };
    return this.page.locator(`#${counterMap[textareaId]}`);
  }

  async openTestPlayModal() {
    await this.testPlayButton.click();
  }

  async closeTestPlayModal() {
    await this.testPlayCloseButton.click();
  }
}
