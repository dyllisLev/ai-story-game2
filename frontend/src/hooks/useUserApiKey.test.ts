// hooks/useUserApiKey.test.ts — Unit tests for useUserApiKey hook
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/* ── Mock API client ── */

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api';
const mockApiGet = api.get as ReturnType<typeof vi.fn>;

/* ── Mock Auth context ── */

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/lib/auth';

/* ── Import hook after mocks are set up ── */

import { useUserApiKey } from './useUserApiKey';

/* ── Tests ── */

describe('useUserApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: null });
    });

    it('should return hasApiKey false and isLoading false', async () => {
      const { result } = renderHook(() => useUserApiKey());

      expect(result.current.hasApiKey).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.masked).toBe(null);
    });

    it('should not call API', () => {
      renderHook(() => useUserApiKey());

      expect(mockApiGet).not.toHaveBeenCalled();
    });
  });

  describe('when user is logged in', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      useAuth.mockReturnValue({ user: mockUser });
    });

    it('should fetch API key status on mount', async () => {
      mockApiGet.mockResolvedValue({
        has_api_key: true,
        masked: 'abcd****wxyz',
      });

      const { result } = renderHook(() => useUserApiKey());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for async operation
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have fetched from API
      expect(mockApiGet).toHaveBeenCalledWith('/me/apikey');
      expect(result.current.hasApiKey).toBe(true);
      expect(result.current.masked).toBe('abcd****wxyz');
    });

    it('should set hasApiKey to true when user has API key', async () => {
      mockApiGet.mockResolvedValue({
        has_api_key: true,
        masked: 'test****1234',
      });

      const { result } = renderHook(() => useUserApiKey());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasApiKey).toBe(true);
      expect(result.current.masked).toBe('test****1234');
    });

    it('should set hasApiKey to false when user does not have API key', async () => {
      mockApiGet.mockResolvedValue({
        has_api_key: false,
        masked: null,
      });

      const { result } = renderHook(() => useUserApiKey());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasApiKey).toBe(false);
      expect(result.current.masked).toBe(null);
    });

    it('should handle API errors gracefully', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUserApiKey());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should default to false on error
      expect(result.current.hasApiKey).toBe(false);
      expect(result.current.masked).toBe(null);
    });

    it('should refetch when user changes', async () => {
      // First user with API key
      mockApiGet
        .mockResolvedValueOnce({
          has_api_key: true,
          masked: 'user1****key',
        })
        .mockResolvedValueOnce({
          has_api_key: false,
          masked: null,
        });

      const { result, rerender } = renderHook(() => useUserApiKey());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasApiKey).toBe(true);
      expect(mockApiGet).toHaveBeenCalledTimes(1);

      // Change user
      const mockUser2 = { id: 'user-456', email: 'test2@example.com' };
      useAuth.mockReturnValue({ user: mockUser2 });

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasApiKey).toBe(false);
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });
  });
});
