import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      setIsAuthenticated(!!token);
    };
    checkAuth();
  }, []);

  const setAuth = async (access_token: string, refresh_token: string) => {
    await AsyncStorage.setItem('accessToken', access_token);
    await AsyncStorage.setItem('refreshToken', refresh_token);
    setIsAuthenticated(true);
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, setAuth, clearAuth };
}
