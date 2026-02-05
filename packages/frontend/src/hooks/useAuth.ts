import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USER_ID_KEY = 'oscar-user-id';

export interface GmailAccount {
  email: string;
  connectedAt: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);

  // Get or create user ID
  useEffect(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }
    setUserId(id);
  }, []);

  const checkAuth = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch(`${API_URL}/auth/status/${userId}`);
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Check auth status on mount and after OAuth redirect
  useEffect(() => {
    if (!userId) return;

    // Check URL for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');
    if (authResult) {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      if (authResult === 'success') {
        // Fetch updated accounts list
        checkAuth();
        return;
      }
    }

    checkAuth();
  }, [userId, checkAuth]);

  const login = useCallback(() => {
    if (userId) {
      window.location.href = `${API_URL}/auth/google?userId=${userId}`;
    }
  }, [userId]);

  const disconnectAccount = useCallback(async (email: string) => {
    if (!userId) return;

    try {
      await fetch(`${API_URL}/auth/disconnect/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Refresh accounts list
      await checkAuth();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, [userId, checkAuth]);

  const logout = useCallback(async () => {
    if (userId) {
      try {
        await fetch(`${API_URL}/auth/logout/${userId}`, { method: 'POST' });
      } catch (error) {
        console.error('Logout failed:', error);
      }
      setIsAuthenticated(false);
      setAccounts([]);
    }
  }, [userId]);

  return {
    isAuthenticated,
    isLoading,
    userId,
    accounts,
    login,
    logout,
    disconnectAccount,
    refreshAccounts: checkAuth,
  };
}
