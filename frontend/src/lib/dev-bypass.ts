// lib/dev-bypass.ts — Centralized dev bypass state management
//
// Architecture:
// - Singleton pattern ensures single source of truth
// - Event-based updates eliminate race conditions
// - Type-safe constants prevent typos
// - Graceful degradation for localStorage failures

import { STORAGE_KEYS, DEV_HEADERS, DEV_HEADER_VALUES } from './constants';

/* ── Types ── */

export type DevBypassState = {
  enabled: boolean;
  lastUpdated: number;
};

export type DevBypassListener = (state: DevBypassState) => void;

/* ── Singleton Dev Bypass Manager ── */

class DevBypassManager {
  private state: DevBypassState = {
    enabled: false,
    lastUpdated: 0,
  };

  private listeners: Set<DevBypassListener> = new Set();

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize state from localStorage on construction.
   * Called once when the module is first loaded.
   */
  private initializeFromStorage(): void {
    try {
      const hasNewKey = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP) === DEV_HEADER_VALUES.SKIP;
      const hasOldKey = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD) === DEV_HEADER_VALUES.TRUE;
      const enabled = hasNewKey || hasOldKey;

      this.state = {
        enabled,
        lastUpdated: Date.now(),
      };

      if (enabled) {
        console.debug('[DevBypass] Initialized with bypass enabled');
      }
    } catch (error) {
      // localStorage unavailable (e.g., private browsing)
      console.debug('[DevBypass] localStorage unavailable, bypass disabled:', error);
      this.state = {
        enabled: false,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Update the dev bypass state by re-reading from localStorage.
   * This should be called whenever the bypass state may have changed.
   */
  update(): void {
    try {
      const hasNewKey = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP) === DEV_HEADER_VALUES.SKIP;
      const hasOldKey = localStorage.getItem(STORAGE_KEYS.DEV_ADMIN_SKIP_OLD) === DEV_HEADER_VALUES.TRUE;
      const enabled = hasNewKey || hasOldKey;

      const previousEnabled = this.state.enabled;
      this.state = {
        enabled,
        lastUpdated: Date.now(),
      };

      // Notify listeners if state changed
      if (previousEnabled !== enabled) {
        console.debug(`[DevBypass] State changed: ${previousEnabled} → ${enabled}`);
        this.notifyListeners();
      }
    } catch (error) {
      // localStorage unavailable - keep current state
      console.debug('[DevBypass] localStorage unavailable, keeping current state:', error);
    }
  }

  /**
   * Get the current dev bypass headers for API requests.
   * Returns a new object each time to prevent mutation issues.
   */
  getHeaders(): Record<string, string> {
    if (!this.state.enabled) {
      return {};
    }

    return {
      [DEV_HEADERS.ADMIN_SKIP]: DEV_HEADER_VALUES.SKIP,
    };
  }

  /**
   * Check if dev bypass is currently enabled.
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }

  /**
   * Subscribe to state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: DevBypassListener): () => void {
    this.listeners.add(listener);

    // Immediately notify listener of current state (with error handling)
    try {
      listener(this.state);
    } catch (error) {
      console.error('[DevBypass] Listener error during subscription:', error);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change.
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[DevBypass] Listener error:', error);
      }
    });
  }

  /**
   * Get the current state (for debugging/testing).
   */
  getState(): Readonly<DevBypassState> {
    return { ...this.state };
  }
}

/* ── Singleton Instance ── */

export const devBypassManager = new DevBypassManager();

/* ── Convenience Functions ── */

/**
 * Update dev bypass state from localStorage.
 * Call this when the bypass state changes (e.g., when "건너뛰기 (Dev)" is clicked).
 */
export function updateDevBypassCache(): void {
  devBypassManager.update();
}

/**
 * Get dev bypass headers for API requests.
 * Returns a new object each time to prevent mutation issues.
 */
export function getDevBypassHeaders(): Record<string, string> {
  return devBypassManager.getHeaders();
}

/**
 * Check if dev bypass is currently enabled.
 */
export function isDevBypassEnabled(): boolean {
  return devBypassManager.isEnabled();
}

/**
 * Subscribe to dev bypass state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToDevBypass(listener: DevBypassListener): () => void {
  return devBypassManager.subscribe(listener);
}
