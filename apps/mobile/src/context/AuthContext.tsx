import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LoginResponseDto, AuthMeResponseDto } from '@japanese-learning/contracts';
import { apiClient } from '../lib/api-client';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
  }, []);

  const verifySession = useCallback(
    async (savedToken: string) => {
      try {
        const me = await apiClient<AuthMeResponseDto>('/auth/me');
        if (me.authenticated) {
          setUser({ username: me.username });
          setToken(savedToken);
        } else {
          await logout();
        }
      } catch {
        await logout();
      } finally {
        setIsLoading(false);
      }
    },
    [logout],
  );

  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await SecureStore.getItemAsync('auth_token');
        const savedUser = await SecureStore.getItemAsync('auth_user');

        if (savedToken) {
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch {
              // ignore
            }
          }
          await verifySession(savedToken);
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [verifySession]);

  const login = async (username: string, password: string) => {
    const res = await apiClient<LoginResponseDto>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    try {
      await SecureStore.setItemAsync('auth_token', res.accessToken);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(res.user));
    } catch {
      // ignore storage failure
    }

    setToken(res.accessToken);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
