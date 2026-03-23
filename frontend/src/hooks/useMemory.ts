// ============================================================
// useMemory — memory fetch/display
// ============================================================
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SessionMemory } from '@story-game/shared';

const MEMORY_CACHE_PREFIX = 'ai-story-session-';
const MEMORY_CACHE_SUFFIX = '-memory';

function saveMemoryToLocal(sessionId: string, memory: SessionMemory): void {
  try {
    localStorage.setItem(
      MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX,
      JSON.stringify(memory)
    );
  } catch {
    // ignore quota errors
  }
}

function loadMemoryFromLocal(sessionId: string): SessionMemory | null {
  try {
    const raw = localStorage.getItem(MEMORY_CACHE_PREFIX + sessionId + MEMORY_CACHE_SUFFIX);
    return raw ? (JSON.parse(raw) as SessionMemory) : null;
  } catch {
    return null;
  }
}

async function loadMemoryFromAPI(sessionId: string): Promise<SessionMemory | null> {
  try {
    return await api.get<SessionMemory>(`/sessions/${sessionId}/memory`);
  } catch {
    return null;
  }
}

export interface UseMemoryReturn {
  memory: SessionMemory | null;
  loadMemory: (sessionId: string) => Promise<SessionMemory | null>;
  updateMemory: (sessionId: string, updated: SessionMemory) => void;
  clearMemory: () => void;
}

export function useMemory(): UseMemoryReturn {
  const [memory, setMemory] = useState<SessionMemory | null>(null);

  const loadMemory = useCallback(async (sessionId: string): Promise<SessionMemory | null> => {
    const remote = await loadMemoryFromAPI(sessionId);
    const local = loadMemoryFromLocal(sessionId);
    const resolved = remote ?? local;
    if (resolved) {
      setMemory(resolved);
      if (remote) saveMemoryToLocal(sessionId, remote);
      return resolved;
    } else {
      setMemory(null);
      return null;
    }
  }, []);

  const updateMemory = useCallback((sessionId: string, updated: SessionMemory): void => {
    setMemory(updated);
    saveMemoryToLocal(sessionId, updated);
    // Persist to API (fire-and-forget)
    api.put(`/sessions/${sessionId}/memory`, updated).catch(() => {/* ignore */});
  }, []);

  const clearMemory = useCallback((): void => {
    setMemory(null);
  }, []);

  return { memory, loadMemory, updateMemory, clearMemory };
}
