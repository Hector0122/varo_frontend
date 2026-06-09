import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { register } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface RegisterForm {
  email: string;
  password: string;
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit } = useForm<RegisterForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const tokens = await register(data);
      await setAuth(tokens.access_token, tokens.refresh_token);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: 'El email es obligatorio' }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: 'La contraseña es obligatoria', minLength: { value: 6, message: 'Mínimo 6 caracteres' } }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={value}
              onChangeText={onChange}
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((s) => !s)}>
              <Text style={[styles.passwordToggleText, { color: colors.textSecondary }]}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Button title={loading ? 'Cargando...' : 'Registrarse'} onPress={handleSubmit(onSubmit)} disabled={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordRow: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    paddingRight: 44,
    fontSize: 16,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    fontSize: 20,
  },
});
