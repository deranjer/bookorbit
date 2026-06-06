import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { secureStorage } from '@/src/auth/storage';
import { serverUrlStore } from '@/src/auth/serverUrlStore';
import { tokenStore } from '@/src/auth/tokenStore';
import type { AuthUser } from '@/src/api/types';

const TOKEN_KEY = 'bookorbit_token';
const SERVER_URL_KEY = 'bookorbit_server_url';
const USER_KEY = 'bookorbit_user';

interface AuthContextValue {
  serverUrl: string | null;
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  setServerUrl: (url: string) => Promise<void>;
  clearServerUrl: () => Promise<void>;
  setToken: (token: string, user: AuthUser) => Promise<void>;
  clearToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      secureStorage.getItemAsync(SERVER_URL_KEY),
      secureStorage.getItemAsync(TOKEN_KEY),
      secureStorage.getItemAsync(USER_KEY),
    ]).then(([url, tok, userJson]) => {
      serverUrlStore.set(url);
      setServerUrlState(url);
      tokenStore.set(tok);
      setTokenState(tok);
      if (userJson) {
        try {
          setUserState(JSON.parse(userJson) as AuthUser);
        } catch {
          // ignore corrupt stored data
        }
      }
      setLoading(false);
    });
  }, []);

  const clearTokenRef = useRef<() => Promise<void>>(async () => {});

  async function clearToken() {
    await Promise.all([secureStorage.deleteItemAsync(TOKEN_KEY), secureStorage.deleteItemAsync(USER_KEY)]);
    tokenStore.set(null);
    setTokenState(null);
    setUserState(null);
  }

  clearTokenRef.current = clearToken;

  useEffect(() => {
    tokenStore.registerLogoutCallback(() => {
      void clearTokenRef.current();
    });
    return () => {
      tokenStore.registerLogoutCallback(null);
    };
  }, []);

  async function setServerUrl(url: string) {
    const trimmed = url.trim().replace(/\/$/, '');
    await secureStorage.setItemAsync(SERVER_URL_KEY, trimmed);
    serverUrlStore.set(trimmed);
    setServerUrlState(trimmed);
  }

  async function clearServerUrl() {
    await secureStorage.deleteItemAsync(SERVER_URL_KEY);
    serverUrlStore.set(null);
    setServerUrlState(null);
  }

  async function setToken(newToken: string, newUser: AuthUser) {
    await Promise.all([secureStorage.setItemAsync(TOKEN_KEY, newToken), secureStorage.setItemAsync(USER_KEY, JSON.stringify(newUser))]);
    tokenStore.set(newToken);
    setTokenState(newToken);
    setUserState(newUser);
  }

  return <AuthContext.Provider value={{ serverUrl, token, user, loading, setServerUrl, clearServerUrl, setToken, clearToken }}>{children}</AuthContext.Provider>;
}
