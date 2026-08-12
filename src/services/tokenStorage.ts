import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE = 'varo.auth';

// Limpieza de la migración AsyncStorage → Keychain: borra los tokens en texto
// plano que versiones anteriores dejaron en disco. Idempotente.
AsyncStorage.removeItem('accessToken').catch(() => {});
AsyncStorage.removeItem('refreshToken').catch(() => {});

interface Tokens {
  access: string | null;
  refresh: string | null;
}

export const getTokens = async (): Promise<Tokens> => {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  if (!creds) return { access: null, refresh: null };
  try {
    return JSON.parse(creds.password);
  } catch {
    return { access: null, refresh: null };
  }
};

export const setTokens = async (access: string, refresh: string) => {
  await Keychain.setGenericPassword('auth', JSON.stringify({ access, refresh }), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const clearTokens = async () => {
  await Keychain.resetGenericPassword({ service: SERVICE });
};
