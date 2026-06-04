import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { logout } from '../services/auth';
import { useAuth } from '../hooks/useAuth';

export default function ProfileScreen() {
  const { clearAuth } = useAuth();

  const handleLogout = async () => {
    await logout();
    await clearAuth();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Button title="Cerrar sesión" onPress={handleLogout} color="#c62828" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
});
