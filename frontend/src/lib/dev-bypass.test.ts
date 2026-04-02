// lib/dev-bypass.test.ts — Unit tests for DevBypassManager
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  devBypassManager,
  updateDevBypassCache,
  getDevBypassHeaders,
  isDevBypassEnabled,
  subscribeToDevBypass,
  type DevBypassState,
} from './dev-bypass';
import { STORAGE_KEYS, DEV_HEADERS, DEV_HEADER_VALUES } from './constants';

/* ── Mock localStorage ── */

const createMockLocalStorage = () => {
  const store = new Map<string, string>();

  const mockLocalStorage = {
    store,
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
  };

  return mockLocalStorage;
};

const mockLocalStorage = createMockLocalStorage();

/* ── Setup and Teardown ── */

beforeEach(() => {
  // Clear the mock localStorage store
  mockLocalStorage.store.clear();

  // Replace localStorage with mock using vitest
  vi.stubGlobal('localStorage', mockLocalStorage);

  // Reset manager state
  (devBypassManager as any).state = { enabled: false, lastUpdated: 0 };
  (devBypassManager as any).listeners.clear();
});

afterEach(() => {
  // Restore original localStorage
  vi.unstubAllGlobals();
});

/* ── Tests ── */

describe('DevBypassManager', () => {
  describe('initialization', () => {
    it('should initialize with bypass disabled when localStorage is empty', () => {
      // Reset state
      (devBypassManager as any).state = { enabled: false, lastUpdated: 0 };

      expect(isDevBypassEnabled()).toBe(false);
      expect(getDevBypassHeaders()).toEqual({});
    });

    it('should initialize with bypass enabled when new key is set', () => {
      // Set localStorage before resetting
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      // Reset state and reinitialize
      (devBypassManager as any).initializeFromStorage();

      expect(isDevBypassEnabled()).toBe(true);
      expect(getDevBypassHeaders()).toEqual({
        [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
      });
    });

    it('should initialize with bypass enabled when old key is set', () => {
      // Set localStorage before resetting
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD, DEV_HEADER_VALUES.TRUE);
      // Reset state and reinitialize
      (devBypassManager as any).initializeFromStorage();

      expect(isDevBypassEnabled()).toBe(true);
    });
  });

  describe('state updates', () => {
    it('should update state when bypass is enabled', () => {
      expect(isDevBypassEnabled()).toBe(false);

      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      expect(isDevBypassEnabled()).toBe(true);
    });

    it('should update state when bypass is disabled', () => {
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      expect(isDevBypassEnabled()).toBe(true);

      mockLocalStorage.removeItem(STORAGE_KEYS.DEV_ADMIN_SKIP);
      updateDevBypassCache();

      expect(isDevBypassEnabled()).toBe(false);
    });

    it('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw errors
      vi.spyOn(mockLocalStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      // Should not throw, should keep current state
      expect(() => updateDevBypassCache()).not.toThrow();
    });
  });

  describe('header generation', () => {
    it('should return empty object when bypass is disabled', () => {
      const headers1 = getDevBypassHeaders();
      const headers2 = getDevBypassHeaders();

      expect(headers1).toEqual({});
      expect(headers2).toEqual({});

      // Verify new objects are returned each time
      expect(headers1).not.toBe(headers2);
    });

    it('should return bypass header when enabled', () => {
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      const headers1 = getDevBypassHeaders();
      const headers2 = getDevBypassHeaders();

      expect(headers1).toEqual({
        [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
      });
      expect(headers2).toEqual({
        [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
      });

      // Verify new objects are returned each time
      expect(headers1).not.toBe(headers2);
    });

    it('should not be affected by header object mutations', () => {
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      const headers1 = getDevBypassHeaders();
      // Mutate the returned object
      (headers1 as any)[DEV_HEADERS.ADMIN_SKIP] = 'modified';

      const headers2 = getDevBypassHeaders();

      // Should return original value, not the mutated one
      expect(headers2[DEV_HEADERS.ADMIN_SKIP]).toBe(DEV_HEADER_VALUES.SKIP);
    });
  });

  describe('state change notifications', () => {
    it('should notify listeners when state changes', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToDevBypass(listener);

      // Initial state notification
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );

      // Change state
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      // Should be notified of state change
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );

      unsubscribe();
    });

    it('should not notify listeners when state does not change', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToDevBypass(listener);

      // Clear initial notification
      listener.mockClear();

      // Update without changing state
      updateDevBypassCache();

      // Should not be notified
      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      subscribeToDevBypass(errorListener);
      subscribeToDevBypass(normalListener);

      // Change state - error listener should throw, but normal listener should still be called
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      // Both listeners should have been called (error listener throws AFTER being called)
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });

    it('should stop notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToDevBypass(listener);

      // Clear initial notification
      listener.mockClear();

      // Unsubscribe
      unsubscribe();

      // Change state
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      // Should not be notified after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('backward compatibility', () => {
    it('should support new key format', () => {
      // Set localStorage
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      // Update state
      (devBypassManager as any).initializeFromStorage();

      expect(isDevBypassEnabled()).toBe(true);
      expect(getDevBypassHeaders()).toEqual({
        [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
      });
    });

    it('should support old key format', () => {
      // Set localStorage
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD, DEV_HEADER_VALUES.TRUE);
      // Update state
      (devBypassManager as any).initializeFromStorage();

      expect(isDevBypassEnabled()).toBe(true);
      expect(getDevBypassHeaders()).toEqual({
        [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
      });
    });

    it('should prioritize new key over old key', () => {
      // Set both keys
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD, DEV_HEADER_VALUES.TRUE);
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      // Update state
      (devBypassManager as any).initializeFromStorage();

      expect(isDevBypassEnabled()).toBe(true);
      expect(getDevBypassHeaders()).toEqual({
        [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
      });
    });
  });

  describe('state immutability', () => {
    it('should return a copy of state, not the original', () => {
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      updateDevBypassCache();

      const state1 = (devBypassManager as any).getState();
      const state2 = (devBypassManager as any).getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('should not allow external mutation of internal state', () => {
      // Set localStorage
      mockLocalStorage.setItem(STORAGE_KEYS.DEV_ADMIN_SKIP, DEV_HEADER_VALUES.SKIP);
      // Update state
      (devBypassManager as any).initializeFromStorage();

      const state = (devBypassManager as any).getState() as DevBypassState;
      // Try to mutate the returned state
      (state as any).enabled = false;
      (state as any).lastUpdated = 0;

      // Internal state should be unchanged
      expect(isDevBypassEnabled()).toBe(true);
    });
  });
});
