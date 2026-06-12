import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNativeBiometricsLegacy } from 'react-native-biometrics';

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';
const PIN_KEY = 'appPin';

export function useBiometrics() {
  const [available, setAvailable] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { available: sensorAvailable } =
          await ReactNativeBiometricsLegacy.isSensorAvailable();
        setAvailable(sensorAvailable);

        const enabledRaw = await AsyncStorage.getItem(BIOMETRICS_ENABLED_KEY);
        setEnabled(enabledRaw === 'true');

        const pinRaw = await AsyncStorage.getItem(PIN_KEY);
        setHasPin(!!pinRaw);
      } catch {
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const promptBiometric = useCallback(async () => {
    try {
      const { success } = await ReactNativeBiometricsLegacy.simplePrompt({
        promptMessage: 'Confirma tu identidad',
      });
      return success;
    } catch {
      return false;
    }
  }, []);

  const enableBiometrics = useCallback(async () => {
    await AsyncStorage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
    setEnabled(true);
  }, []);

  const disableBiometrics = useCallback(async () => {
    await AsyncStorage.removeItem(BIOMETRICS_ENABLED_KEY);
    await AsyncStorage.removeItem(PIN_KEY);
    setEnabled(false);
    setHasPin(false);
  }, []);

  const setPin = useCallback(async (pin: string) => {
    await AsyncStorage.setItem(PIN_KEY, pin);
    setHasPin(true);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const stored = await AsyncStorage.getItem(PIN_KEY);
    return stored === pin;
  }, []);

  return {
    available,
    enabled,
    hasPin,
    loading,
    promptBiometric,
    enableBiometrics,
    disableBiometrics,
    setPin,
    verifyPin,
  };
}
