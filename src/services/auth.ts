import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoginPayload, RegisterPayload, AuthTokens } from '../types';

export const login = async (payload: LoginPayload): Promise<AuthTokens> => {
  const { data } = await api.post('/auth/login', payload);
  await AsyncStorage.setItem('accessToken', data.access_token);
  await AsyncStorage.setItem('refreshToken', data.refresh_token);
  return data;
};

export const register = async (payload: RegisterPayload): Promise<AuthTokens> => {
  const { data } = await api.post('/auth/register', payload);
  await AsyncStorage.setItem('accessToken', data.access_token);
  await AsyncStorage.setItem('refreshToken', data.refresh_token);
  return data;
};

export const logout = async () => {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
};

export const getToken = async () => {
  return AsyncStorage.getItem('accessToken');
};
