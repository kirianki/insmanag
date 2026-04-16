// lib/auth.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setTokens, clearTokens, getToken } from './api'; // Import token helpers
import { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>; // Updated signature
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getToken(); // Use getToken helper
      if (storedToken) {
        try {
          const response = await api.get('/accounts/users/me/');
          setUser(response.data);
        } catch (error) {
          console.error('Session validation failed. Token might be expired.', error);
          clearTokens(); // Use clearTokens to remove both
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    setIsLoading(true);
    setTokens(accessToken, refreshToken); // Use setTokens to store both
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    try {
      const response = await api.get('/accounts/users/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user after login', error);
      clearTokens(); // Clear all tokens on failure
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
    setIsLoading(false);
  };

  const logout = () => {
    clearTokens(); // Use clearTokens to remove both
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  if (isLoading) {
    return <div>Loading Application...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};