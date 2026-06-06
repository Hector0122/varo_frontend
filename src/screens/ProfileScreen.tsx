import React from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { logout } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function ProfileScreen() {
  const { clearAuth } = useAuth();
  const { mode, toggle, colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = async () => {
    await logout();
    await clearAuth();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>

      <TouchableOpacity
        style={[styles.option, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={toggle}
      >
        <Text style={[styles.optionText, { color: colors.text }]}>
          {mode === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => navigation.navigate('Categories')}
      >
        <Text style={[styles.optionText, { color: colors.text }]}>🏷️ Administrar categorías</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />

      <Button title="Cerrar sesión" onPress={handleLogout} color={colors.red} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
});
