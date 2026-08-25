'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoginResponseDto, AuthMeResponseDto } from '@japanese-learning/contracts';
import { apiClient } from '@/lib/api-client';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    if (pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  const verifySession = useCallback(
    async (savedToken: string) => {
      try {
        const me = await apiClient<AuthMeResponseDto>('/auth/me');
        if (me.authenticated) {
          setUser({ username: me.username });
          setToken(savedToken);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    },
    [logout],
  );

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken) {
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
      verifySession(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [verifySession]);

  const login = async (username: string, password: string) => {
    const res = await apiClient<LoginResponseDto>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
    router.push('/');
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
