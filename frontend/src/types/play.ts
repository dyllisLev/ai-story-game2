// ============================================================
// Play Page Types
// ============================================================

export type MessageRole = 'user' | 'model';

export interface GeminiPart {
  text: string;
}

export interface GeminiMessage {
  role: MessageRole;
  parts: GeminiPart[];
  _timestamp?: number;
}

export type InputMode = 'action' | 'thought' | 'dialogue' | 'scene';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'offline';

export interface SessionListEntry {
  sessionId: string;
  title: string;
  lastPlayedAt: number;
}

export interface SessionPreset {
  worldSetting?: string;
  story?: string;
  characterName?: string;
  characterSetting?: string;
  characters?: string;
  userNote?: string;
  systemRules?: string;
  useLatex?: boolean;
  useCache?: boolean;
  narrativeLength?: number;
}

export interface SessionDocument {
  story_id: string | null;
  title: string;
  preset: SessionPreset;
  messages: StoredMessage[];
  model: string;
  summary?: string;
  summary_up_to_index?: number;
}

export interface StoredMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface LoadedSession {
  storyId?: string;
  title?: string;
  preset?: SessionPreset;
  messages?: StoredMessage[] | GeminiMessage[];
  model?: string;
  summary?: string;
  summaryUpToIndex?: number;
  createdAt?: string;
  updatedAt?: string;
  lastPlayedAt?: string;
  ownerUid?: string;
}

export type { SessionMemory } from '@story-game/shared';

export interface TokenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
}

export type RightPanelTab = 'info' | 'memory' | 'notes' | 'output';

export interface SettingsData {
  title: string;
  worldSetting: string;
  story: string;
  characterName: string;
  characterSetting: string;
  characters: string;
  userNote: string;
  systemRules: string;
  _pendingModel?: string;
}

export interface StatusAttribute {
  id: string;
  name: string;
  type: 'bar' | 'percent' | 'number' | 'text' | 'list';
  max: string;
}

export interface GameStartResponse {
  sessionId: string;
  sessionToken: string | null;
  systemPrompt: string;
  startMessage: string;
  safetySettings: unknown[];
}

export interface ChatPromptResponse {
  systemPrompt: string;
  contents: GeminiMessage[];
  safetySettings: unknown[];
  model: string;
  hasMemory?: boolean;
}

export interface GeminiStreamBody {
  cachedContent?: string;
  system_instruction?: { parts: GeminiPart[] };
  contents: GeminiMessage[];
  safetySettings: unknown[];
}

export type MessageBlock =
  | { type: 'narrator'; text: string; id: string; animDelay?: number }
  | { type: 'dialogue'; charName: string; charRole?: string; charColor?: string; charEmoji?: string; text: string; id: string; animDelay?: number }
  | { type: 'user'; text: string; id: string; animDelay?: number }
  | { type: 'system'; text: string; id: string; animDelay?: number }
  | { type: 'streaming'; text: string; id: string };
