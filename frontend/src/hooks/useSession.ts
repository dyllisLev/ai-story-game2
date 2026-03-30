// ============================================================
// useSession — Session CRUD (localStorage + API)
// ============================================================
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  SessionListEntry,
  LoadedSession,
  StoredMessage,
  GeminiMessage,
} from '@/types/play';

const SESSION_LIST_KEY = 'ai-story-game-sessions';
const SESSION_DATA_PREFIX = 'ai-story-session-';
const MAX_SESSION_LIST = 20;

// ---- localStorage helpers ----

export function getSessionList(): SessionListEntry[] {
  try {
    return JSON.parse(localStorage.getItem(SESSION_LIST_KEY) ?? '[]') as SessionListEntry[];
  } catch {
    return [];
  }
}

function saveSessionList(list: SessionListEntry[]): void {
  let sorted = [...list].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  if (sorted.length > MAX_SESSION_LIST) sorted = sorted.slice(0, MAX_SESSION_LIST);
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(sorted));
}

export function addToSessionList(sessionId: string, title: string, lastPlayedAt?: number): void {
  const list = getSessionList();
  const idx = list.findIndex((s) => s.sessionId === sessionId);
  const ts = lastPlayedAt ?? Date.now();
  if (idx >= 0) {
    list[idx] = { ...list[idx], title: title || list[idx].title, lastPlayedAt: lastPlayedAt ?? list[idx].lastPlayedAt };
  } else {
    list.unshift({ sessionId, title: title || '제목 없음', lastPlayedAt: ts });
  }
  saveSessionList(list);
}

export function removeFromSessionList(sessionId: string): void {
  saveSessionList(getSessionList().filter((s) => s.sessionId !== sessionId));
}

export function saveSessionToLocal(sessionId: string, data: object): void {
  try {
    localStorage.setItem(SESSION_DATA_PREFIX + sessionId, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function loadSessionFromLocal(sessionId: string): LoadedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_DATA_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as LoadedSession) : null;
  } catch {
    return null;
  }
}

export function removeSessionFromLocal(sessionId: string): void {
  localStorage.removeItem(SESSION_DATA_PREFIX + sessionId);
}

// ---- message serialization helpers ----

export function messagesToStorage(history: GeminiMessage[]): StoredMessage[] {
  return history.map((msg) => ({
    role: msg.role,
    content: msg.parts[0]?.text ?? '',
    timestamp: msg._timestamp ?? Date.now(),
  }));
}

export function messagesFromStorage(stored: StoredMessage[]): GeminiMessage[] {
  return stored.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
    _timestamp: msg.timestamp,
  }));
}

// ---- API calls ----

async function loadSessionFromAPI(sessionId: string): Promise<LoadedSession | null> {
  try {
    const data = await api.get<{
      id?: string;
      story_id?: string;
      title?: string;
      preset?: object;
      messages?: StoredMessage[];
      model?: string;
      summary?: string;
      summary_up_to_index?: number;
      created_at?: string;
      updated_at?: string;
      last_played_at?: string;
      owner_uid?: string;
    }>(`/sessions/${sessionId}`);
    return {
      storyId: data.story_id,
      title: data.title,
      preset: data.preset as LoadedSession['preset'],
      messages: data.messages,
      model: data.model,
      summary: data.summary,
      summaryUpToIndex: data.summary_up_to_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastPlayedAt: data.last_played_at,
      ownerUid: data.owner_uid,
    };
  } catch {
    return null;
  }
}

// ---- hook ----

export interface UseSessionReturn {
  sessionList: SessionListEntry[];
  refreshSessionList: () => void;
  loadSession: (sessionId: string) => Promise<LoadedSession | null>;
  deleteSession: (sessionId: string) => void;
}

export function useSession(): UseSessionReturn {
  const [sessionList, setSessionList] = useState<SessionListEntry[]>(() => getSessionList());

  const refreshSessionList = useCallback(() => {
    setSessionList(getSessionList());
  }, []);

  const loadSession = useCallback(async (sessionId: string): Promise<LoadedSession | null> => {
    const local = loadSessionFromLocal(sessionId);
    const remote = await loadSessionFromAPI(sessionId);

    if (!local && !remote) return null;

    let data: LoadedSession;
    if (local && remote) {
      const localTime = (local as { updatedAt?: number }).updatedAt ?? 0;
      const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
      data = localTime > remoteTime ? local : remote;
    } else {
      data = (remote ?? local)!;
    }

    // Cache to local
    if (remote) {
      saveSessionToLocal(sessionId, { ...data, updatedAt: Date.now(), lastPlayedAt: Date.now() });
    }

    return data;
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    removeFromSessionList(sessionId);
    removeSessionFromLocal(sessionId);
    setSessionList(getSessionList());
  }, []);

  return { sessionList, refreshSessionList, loadSession, deleteSession };
}
