import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  StoredUser,
  clearSession,
  fetchCurrentUser,
  fetchToken,
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setStoredUser,
} from '@/lib/auth';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toAuthUser = (stored: StoredUser): AuthUser => ({
  id: stored.id,
  email: stored.email,
  role: stored.role,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredUser();
    return stored ? toAuthUser(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((accessToken: string, authUser: StoredUser) => {
    setAccessToken(accessToken);
    setStoredUser(authUser);
    setToken(accessToken);
    setUser(toAuthUser(authUser));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const accessToken = await fetchToken(email.trim(), password);
    const authUser = await fetchCurrentUser(accessToken);
    persistSession(accessToken, authUser);
  }, [persistSession]);

  const register = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const message =
        typeof detail?.detail === 'string' ? detail.detail : 'Registration failed.';
      throw new Error(
        message === 'Email already registered' ? 'Email already exists' : message,
      );
    }

    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = getAccessToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const authUser = await fetchCurrentUser(storedToken);
        persistSession(storedToken, authUser);
      } catch {
        clearSession();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [persistSession]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
