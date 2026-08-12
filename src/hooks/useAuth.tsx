import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTokens, setTokens, clearTokens } from '../services/tokenStorage';

interface AuthContextType {
  isAuthenticated: boolean | null;
  isLocked: boolean;
  setAuth: (access_token: string, refresh_token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  lockApp: () => Promise<void>;
  unlockApp: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCKED_KEY = 'appLocked';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { access } = await getTokens();
        const locked = await AsyncStorage.getItem(LOCKED_KEY);
        setIsAuthenticated(!!access);
        setIsLocked(locked === 'true');
      } catch {
        setIsAuthenticated(false);
        setIsLocked(false);
      }
    };
    checkAuth();

    // Timeout de seguridad: si AsyncStorage se queda colgada, forzar false
    const timeout = setTimeout(() => {
      setIsAuthenticated((prev) => (prev === null ? false : prev));
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  const setAuth = useCallback(async (access_token: string, refresh_token: string) => {
    await setTokens(access_token, refresh_token);
    await AsyncStorage.removeItem(LOCKED_KEY);
    setIsAuthenticated(true);
    setIsLocked(false);
  }, []);

  const clearAuth = useCallback(async () => {
    await clearTokens();
    await AsyncStorage.removeItem(LOCKED_KEY);
    setIsAuthenticated(false);
    setIsLocked(false);
  }, []);

  const lockApp = useCallback(async () => {
    await AsyncStorage.setItem(LOCKED_KEY, 'true');
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(async () => {
    await AsyncStorage.removeItem(LOCKED_KEY);
    setIsLocked(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setAuth, clearAuth, lockApp, unlockApp, isLocked }}>
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
