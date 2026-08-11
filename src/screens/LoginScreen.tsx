import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { login } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { iconSize } from '../theme/tokens';
import Button from '../components/Button';
import type { AuthStackParamList } from '../navigation/AuthStack';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const tokens = await login(data);
      await setAuth(tokens.access_token, tokens.refresh_token);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Credenciales inválidas',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Varo</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Cada peso cuenta
      </Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: 'El email es obligatorio' }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
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
        rules={{
          required: 'La contraseña es obligatoria',
          minLength: { value: 6, message: 'Mínimo 6 caracteres' },
        }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.passwordInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={value}
              onChangeText={onChange}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(s => !s)}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={iconSize.md}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}
      />

      <Button
        title="Iniciar sesión"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={styles.link}
      >
        <Text style={[styles.linkText, { color: colors.green }]}>
          ¿No tienes cuenta? Regístrate
        </Text>
      </TouchableOpacity>
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  link: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
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
});
