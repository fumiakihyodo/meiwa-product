'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginCredentials } from '@/types';
import { authApi } from '@/services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

interface ApiError {
    response?: {
        data?: {
            detail?: string;
            message?: string;
        };
        status?: number;
    };
    message?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within aun AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children : ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;
  const isAdmin = user?.is_administrator || false;

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authApi.checkAuth();
      if (response.is_authenticated) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
      toast.success('ログインしました');
      router.push('/dashboard');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    }
  };

  // loginヘルパー関数
  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;
        return apiError.response?.data?.detail || 'ログインに失敗しました';
    }
    return 'ログインに失敗しました'
  }

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      toast.success('ログアウトしました');
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.checkAuth();
      if (response.is_authenticated) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('User refresh failed:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
