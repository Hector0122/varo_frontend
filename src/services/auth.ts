import { api } from './api';
import { setTokens, clearTokens } from './tokenStorage';
import type { LoginPayload, RegisterPayload, AuthTokens } from '../types';

export const login = async (payload: LoginPayload): Promise<AuthTokens> => {
  const { data } = await api.post('/auth/login', payload);
  await setTokens(data.access_token, data.refresh_token);
  return data;
};

export const register = async (payload: RegisterPayload): Promise<AuthTokens> => {
  const { data } = await api.post('/auth/register', payload);
  await setTokens(data.access_token, data.refresh_token);
  return data;
};

export const logout = async () => {
  await clearTokens();
};
