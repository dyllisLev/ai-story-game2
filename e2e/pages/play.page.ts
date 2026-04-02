import type { Page, Locator } from '@playwright/test';
import { e2eConfig } from '../config';

export class PlayPage {
  readonly page: Page;

  // TopBar
  readonly apiKeyInput: Locator;
  readonly modelSelect: Locator;
  readonly leftPanelToggle: Locator;
  readonly charModalButton: Locator;
  readonly rightPanelToggle: Locator;
  readonly themeToggle: Locator;

  // Session Panel
  readonly sessionPanel: Locator;
  readonly newSessionButton: Locator;
  readonly closeSidebarButton: Locator;
  readonly sessionItems: Locator;
  readonly sessionIdInput: Locator;
  readonly loadByIdButton: Locator;
  readonly emptySessionMessage: Locator;

  // Input Area
  readonly actionModeButton: Locator;
  readonly thoughtModeButton: Locator;
  readonly dialogueModeButton: Locator;
  readonly sceneModeButton: Locator;
  readonly inputTextarea: Locator;
  readonly sendButton: Locator;
  readonly startGameButton: Locator;
  readonly regenerateButton: Locator;

  // Story Content
  readonly storyContent: Locator;
  readonly emptyContentMessage: Locator;

  // Character Modal
  readonly charModal: Locator;
  readonly charModalClose: Locator;
  readonly charNameInput: Locator;
  readonly charSettingTextarea: Locator;
  readonly charSaveButton: Locator;

  // Info Panel
  readonly infoPanel: Locator;
  readonly infoTab: Locator;
  readonly memoryTab: Locator;
  readonly notesTab: Locator;
  readonly outputTab: Locator;

  // Output Tab
  readonly narrativeMinusButton: Locator;
  readonly narrativePlusButton: Locator;
  readonly saveNowButton: Locator;

  // Notes Tab
  readonly notesCharName: Locator;
  readonly notesCharSetting: Locator;
  readonly notesMemo: Locator;

  // Layout
  readonly layout: Locator;

  constructor(page: Page) {
    this.page = page;

    // TopBar
    this.apiKeyInput = page.getByLabel('Gemini API 키 입력');
    this.modelSelect = page.getByLabel('AI 모델 선택');
    this.leftPanelToggle = page.locator('.btn-icon').filter({ hasText: '☰' });
    this.charModalButton = page.locator('.btn-icon').filter({ hasText: '📒' });
    this.rightPanelToggle = page.locator('.btn-icon').filter({ hasText: '⊞' });
    this.themeToggle = page.locator('.btn-icon').filter({ hasText: /🌙|☀️/ });

    // Session Panel
    this.sessionPanel = page.locator('.session-panel');
    this.newSessionButton = page.getByLabel('새 세션 시작');
    this.closeSidebarButton = page.locator('.btn-icon').filter({ hasText: '◀' });
    this.sessionItems = page.locator('.session-item');
    this.sessionIdInput = page.getByLabel('세션 ID 입력');
    this.loadByIdButton = page.locator('.session-load-btn').filter({ hasText: '불러오기' });
    this.emptySessionMessage = page.locator('text=세션 기록이 없습니다');

    // Input Area
    this.actionModeButton = page.locator('.input-toolbar-btn').filter({ hasText: /행동/ });
    this.thoughtModeButton = page.locator('.input-toolbar-btn').filter({ hasText: /생각/ });
    this.dialogueModeButton = page.locator('.input-toolbar-btn').filter({ hasText: /대사/ });
    this.sceneModeButton = page.locator('.input-toolbar-btn').filter({ hasText: /장면/ });
    this.inputTextarea = page.getByLabel('입력창');
    this.sendButton = page.getByLabel('전송');
    this.startGameButton = page.locator('.input-toolbar-btn').filter({ hasText: '게임 시작' });
    this.regenerateButton = page.locator('.input-toolbar-btn').filter({ hasText: '재생성' });

    // Story Content
    this.storyContent = page.locator('.story-content, .narr-list');
    this.emptyContentMessage = page.locator('text=게임을 시작하려면');

    // Character Modal
    this.charModal = page.locator('[role="dialog"][aria-label="등장인물"]');
    this.charModalClose = page.locator('.char-modal-close');
    this.charNameInput = this.charModal.locator('input[type="text"]').first();
    this.charSettingTextarea = this.charModal.locator('textarea').first();
    this.charSaveButton = this.charModal.locator('.session-load-btn').filter({ hasText: '저장' });

    // Info Panel
    this.infoPanel = page.locator('.info-panel');
    this.infoTab = page.locator('[role="tab"]').filter({ hasText: '정보' });
    this.memoryTab = page.locator('[role="tab"]').filter({ hasText: '기억' });
    this.notesTab = page.locator('[role="tab"]').filter({ hasText: '노트' });
    this.outputTab = page.locator('[role="tab"]').filter({ hasText: '출력' });

    // Output Tab
    this.narrativeMinusButton = page.getByLabel('서사 길이 줄이기');
    this.narrativePlusButton = page.getByLabel('서사 길이 늘리기');
    this.saveNowButton = page.locator('.session-load-btn').filter({ hasText: '지금 저장' });

    // Notes Tab
    this.notesCharName = page.locator('#notes-char-name');
    this.notesCharSetting = page.locator('#notes-char-setting');
    this.notesMemo = page.locator('#notes-memo');

    // Layout
    this.layout = page.locator('.play-layout');
  }

  async goto(storyId?: string) {
    const path = storyId ? `/play/${storyId}` : '/play';
    await this.page.goto(e2eConfig.baseURL + path);
    // Use domcontentloaded instead of networkidle to avoid timeout
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  }

  async toggleLeftPanel() {
    await this.leftPanelToggle.click();
  }

  async toggleRightPanel() {
    await this.rightPanelToggle.click();
  }

  async openCharacterModal() {
    await this.charModalButton.click();
  }

  async closeCharacterModal() {
    await this.charModalClose.click();
  }

  async selectInputMode(mode: 'action' | 'thought' | 'dialogue' | 'scene') {
    const buttons = {
      action: this.actionModeButton,
      thought: this.thoughtModeButton,
      dialogue: this.dialogueModeButton,
      scene: this.sceneModeButton,
    };
    await buttons[mode].click();
  }

  async typeMessage(text: string) {
    await this.inputTextarea.fill(text);
  }

  modeButton(mode: 'action' | 'thought' | 'dialogue' | 'scene') {
    const buttons = {
      action: this.actionModeButton,
      thought: this.thoughtModeButton,
      dialogue: this.dialogueModeButton,
      scene: this.sceneModeButton,
    };
    return buttons[mode];
  }
}
