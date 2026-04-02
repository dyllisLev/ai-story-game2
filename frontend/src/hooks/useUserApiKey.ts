// ============================================================
// useUserApiKey — Check if logged-in user has registered API key
// ============================================================
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface UserApiKeyStatus {
  hasApiKey: boolean;
  isLoading: boolean;
  masked: string | null;
}

export function useUserApiKey(): UserApiKeyStatus {
  const { user } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [masked, setMasked] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Not logged in or in dev bypass mode
    if (!user) {
      setHasApiKey(false);
      setMasked(null);
      setIsLoading(false);
      return;
    }

    // Fetch user's API key status
    const fetchApiKeyStatus = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<{ has_api_key: boolean; masked: string | null }>('/me/apikey');
        setHasApiKey(data.has_api_key);
        setMasked(data.masked);
      } catch {
        // If request fails, assume no API key
        setHasApiKey(false);
        setMasked(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKeyStatus();
  }, [user]);

  return { hasApiKey, isLoading, masked };
}
