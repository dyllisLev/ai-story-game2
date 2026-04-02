// pages/Play.test.tsx — Unit tests for Play page panel toggle functionality
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Play from './Play';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* ── Mocks ── */

// Mock all the hooks
vi.mock('@/hooks/useGameEngine', () => ({
  useGameEngine: () => ({
    settingsData: {
      title: 'Test Story',
      characterName: 'Test Character',
    },
    messages: [],
    isGenerating: false,
    currentStoryId: 'test-story-id',
    currentSessionId: null,
    tokenUsage: { promptTokens: 0, candidatesTokens: 0 },
    conversationHistory: [],
    useLatex: false,
    useCache: true,
    narrativeLength: 'medium',
    saveStatus: 'saved',
    startNewGame: vi.fn(),
    startGame: vi.fn(),
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    updateSettingsData: vi.fn(),
    setUseLatex: vi.fn(),
    setUseCache: vi.fn(),
    setNarrativeLength: vi.fn(),
    saveNow: vi.fn(),
    loadSessionIntoEngine: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    sessionList: [],
    refreshSessionList: vi.fn(),
    loadSession: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMemory', () => ({
  useMemory: () => ({
    memory: null,
    loadMemory: vi.fn(),
    updateMemory: vi.fn(),
  }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    data: {
      gameplayConfig: {
        input_modes: [
          { id: 'action', prefix: '행동:' },
          { id: 'thought', prefix: '생각:' },
        ],
        default_suggestions: [],
      },
    },
  }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { nickname: 'TestUser', email: 'test@example.com' },
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    subscribeToDevBypass: vi.fn(),
    isDevBypassEnabled: vi.fn(() => false),
  },
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    show: vi.fn(),
  }),
}));

vi.mock('@/lib/sse', () => ({
  fetchGeminiModels: vi.fn(async () => [
    { id: 'gemini-pro', name: 'Gemini Pro' },
  ]),
}));

/* ── Test Helpers ── */

let queryClient: QueryClient;

const renderPlay = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/play']}>
        <Play />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/* ── Tests ── */

describe('Play Page - Panel Toggle Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorageMock);

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal('sessionStorage', sessionStorageMock);

    // Mock window.matchMedia
    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Left Panel (Session Panel) CSS Classes', () => {
    it('should render .panel-left element by default', () => {
      const { container } = renderPlay();

      const leftPanel = container.querySelector('.panel-left');
      expect(leftPanel).toBeTruthy();
    });

    it('should add panel-collapsed class when left panel is closed', () => {
      const { container } = renderPlay();

      const leftToggle = screen.getByLabelText('왼쪽 패널 토글');

      // Click to close
      fireEvent.click(leftToggle);

      const leftPanel = container.querySelector('.panel-left');
      expect(leftPanel).toBeTruthy();
      expect(leftPanel?.classList.contains('panel-collapsed')).toBe(true);
    });

    it('should remove panel-collapsed class when left panel is reopened', () => {
      const { container } = renderPlay();

      const leftToggle = screen.getByLabelText('왼쪽 패널 토글');

      // Close
      fireEvent.click(leftToggle);

      // Reopen
      fireEvent.click(leftToggle);

      const leftPanel = container.querySelector('.panel-left');
      expect(leftPanel).toBeTruthy();
      expect(leftPanel?.classList.contains('panel-collapsed')).toBe(false);
    });
  });

  describe('Right Panel (Info Panel) CSS Classes', () => {
    it('should render .panel-right element by default', () => {
      const { container } = renderPlay();

      const rightPanel = container.querySelector('.panel-right');
      expect(rightPanel).toBeTruthy();
    });

    it('should add panel-collapsed class when right panel is closed', () => {
      const { container } = renderPlay();

      const rightToggle = screen.getByLabelText('오른쪽 패널 토글');

      // Click to close
      fireEvent.click(rightToggle);

      const rightPanel = container.querySelector('.panel-right');
      expect(rightPanel).toBeTruthy();
      expect(rightPanel?.classList.contains('panel-collapsed')).toBe(true);
    });

    it('should remove panel-collapsed class when right panel is reopened', () => {
      const { container } = renderPlay();

      const rightToggle = screen.getByLabelText('오른쪽 패널 토글');

      // Close
      fireEvent.click(rightToggle);

      // Reopen
      fireEvent.click(rightToggle);

      const rightPanel = container.querySelector('.panel-right');
      expect(rightPanel).toBeTruthy();
      expect(rightPanel?.classList.contains('panel-collapsed')).toBe(false);
    });
  });

  describe('E2E Test Compatibility - Root Fix', () => {
    it('should ensure .panel-left selector works even when panel is closed', () => {
      const { container } = renderPlay();

      const leftToggle = screen.getByLabelText('왼쪽 패널 토글');

      // Verify panel exists before toggle
      let leftPanel = container.querySelector('.panel-left');
      expect(leftPanel).toBeTruthy();

      // Close panel
      fireEvent.click(leftToggle);

      // Verify panel still exists in DOM (this is the fix!)
      leftPanel = container.querySelector('.panel-left');
      expect(leftPanel).toBeTruthy();

      // Verify it has the collapsed class
      expect(leftPanel?.classList.contains('panel-collapsed')).toBe(true);
    });

    it('should ensure .panel-right selector works even when panel is closed', () => {
      const { container } = renderPlay();

      const rightToggle = screen.getByLabelText('오른쪽 패널 토글');

      // Verify panel exists before toggle
      let rightPanel = container.querySelector('.panel-right');
      expect(rightPanel).toBeTruthy();

      // Close panel
      fireEvent.click(rightToggle);

      // Verify panel still exists in DOM (this is the fix!)
      rightPanel = container.querySelector('.panel-right');
      expect(rightPanel).toBeTruthy();

      // Verify it has the collapsed class
      expect(rightPanel?.classList.contains('panel-collapsed')).toBe(true);
    });
  });

  describe('Layout Classes', () => {
    it('should apply left-collapsed class when only left panel is closed', () => {
      const { container } = renderPlay();

      const leftToggle = screen.getByLabelText('왼쪽 패널 토글');

      fireEvent.click(leftToggle);

      const layout = container.querySelector('.play-layout');
      expect(layout?.classList.contains('left-collapsed')).toBe(true);
      expect(layout?.classList.contains('right-collapsed')).toBe(false);
      expect(layout?.classList.contains('both-collapsed')).toBe(false);
    });

    it('should apply right-collapsed class when only right panel is closed', () => {
      const { container } = renderPlay();

      const rightToggle = screen.getByLabelText('오른쪽 패널 토글');

      fireEvent.click(rightToggle);

      const layout = container.querySelector('.play-layout');
      expect(layout?.classList.contains('right-collapsed')).toBe(true);
      expect(layout?.classList.contains('left-collapsed')).toBe(false);
      expect(layout?.classList.contains('both-collapsed')).toBe(false);
    });

    it('should apply both-collapsed class when both panels are closed', () => {
      const { container } = renderPlay();

      const leftToggle = screen.getByLabelText('왼쪽 패널 토글');
      const rightToggle = screen.getByLabelText('오른쪽 패널 토글');

      fireEvent.click(leftToggle);
      fireEvent.click(rightToggle);

      const layout = container.querySelector('.play-layout');
      expect(layout?.classList.contains('both-collapsed')).toBe(true);
    });
  });
});
