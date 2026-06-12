import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useBiometrics } from '../hooks/useBiometrics';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { colors } = useTheme();
  const { available, promptBiometric, verifyPin, enabled } = useBiometrics();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (available && enabled) {
      promptBiometric().then((success) => {
        if (success) onUnlock();
      });
    }
  }, [available, enabled, promptBiometric, onUnlock]);

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setError(true);
      return;
    }
    const valid = await verifyPin(pin);
    if (valid) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setAttempts((a) => a + 1);
      if (attempts >= 4) {
        Alert.alert('Demasiados intentos', 'La app se cerrará por seguridad.');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🔒 Varo</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {available && enabled
          ? 'Usa tu huella o ingresa tu PIN'
          : 'Ingresa tu PIN para continuar'}
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            borderColor: error ? colors.red : colors.border,
            color: colors.text,
            backgroundColor: colors.inputBg,
          },
        ]}
        placeholder="PIN (4 dígitos)"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        value={pin}
        onChangeText={(text) => {
          setPin(text);
          setError(false);
        }}
        onSubmitEditing={handlePinSubmit}
      />

      {error && (
        <Text style={[styles.error, { color: colors.red }]}>
          PIN incorrecto
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.green }]}
        onPress={handlePinSubmit}
      >
        <Text style={styles.buttonText}>Desbloquear</Text>
      </TouchableOpacity>

      {available && enabled && (
        <TouchableOpacity
          style={[styles.bioButton, { borderColor: colors.border }]}
          onPress={() =>
            promptBiometric().then((success) => {
              if (success) onUnlock();
            })
          }
        >
          <Text style={[styles.bioButtonText, { color: colors.green }]}>
            🔓 Usar huella / Face ID
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bioButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  bioButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
