'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: { accessToken: string; refreshToken: string }) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true on initial app load

  // This effect runs once when the app is first loaded.
  // Its only job is to check for an existing token and fetch the user's data.
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          // Set the auth header for the initial API call
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get<User>('/accounts/users/me/');
          setUser(response.data);
        } catch (error) {
          console.error("Auth token is invalid, logging out.", error);
          // If the token is expired or invalid, clear everything.
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      // FIX: This is the most critical change.
      // We set isLoading to false *after* the check is complete,
      // regardless of whether a user was found or not. This signals to the
      // rest of the app that the initial authentication check is done.
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []); // The empty dependency array ensures this runs only once.

  const login = async (data: { accessToken: string; refreshToken: string }) => {
    setIsLoading(true); // Let the UI know a transition is happening
    try {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      // Immediately set the header for subsequent API calls in this session
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      
      const userResponse = await api.get<User>('/accounts/users/me/');
      setUser(userResponse.data);
    } catch (error) {
        console.error("Failed to login or fetch user after login", error);
        // If something goes wrong, perform a full logout to clear the bad state
        logout();
    } finally {
        setIsLoading(false); // The login process is complete
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Also remove the auth header from the running api instance
    delete api.defaults.headers.common['Authorization'];
    
    // A hard redirect is often best for logout to clear all component states
    // and ensure a clean start on the login page.
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};