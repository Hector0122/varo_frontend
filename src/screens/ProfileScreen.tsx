import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logout } from '../services/auth';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { iconSize } from '../theme/tokens';
import { useBiometrics } from '../hooks/useBiometrics';
import Button from '../components/Button';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function ProfileScreen() {
  const { clearAuth, lockApp } = useAuth();
  const { mode, toggle, colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { available, enabled, enableBiometrics, disableBiometrics, setPin } =
    useBiometrics();
  const [pinInput, setPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);

  const handleLogout = async () => {
    await logout();
    await clearAuth();
  };

  const handleSetupPin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('PIN muy corto', 'El PIN debe tener al menos 4 dígitos');
      return;
    }
    await setPin(pinInput);
    await enableBiometrics();
    setPinInput('');
    setShowPinSetup(false);
    Alert.alert(
      'Listo',
      'Bloqueo activado. La próxima vez que abras la app se pedirá el PIN.',
    );
  };

  const handleDisableLock = async () => {
    Alert.alert('Desactivar bloqueo', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          await disableBiometrics();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>

      <TouchableOpacity
        style={[
          styles.option,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
        onPress={toggle}
      >
        <Text style={[styles.optionText, { color: colors.text }]}>
          {mode === 'dark' ? (
            <><Icon name="weather-sunny" size={iconSize.sm} color={colors.text} /> Modo claro</>
          ) : (
            <><Icon name="weather-night" size={iconSize.sm} color={colors.text} /> Modo oscuro</>
          )}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.option,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate('Categories')}
      >
        <Text style={[styles.optionText, { color: colors.text }]}>
          <Icon name="tag-outline" size={iconSize.sm} color={colors.text} /> Administrar categorías
        </Text>
      </TouchableOpacity>

      {/* Bloqueo */}
      {!enabled ? (
        <TouchableOpacity
          style={[
            styles.option,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
          onPress={() => setShowPinSetup(true)}
        >
          <Text style={[styles.optionText, { color: colors.text }]}>
            <Icon name="lock-outline" size={iconSize.sm} color={colors.text} />{' '}
            {available ? 'Activar bloqueo (PIN / Huella)' : 'Activar bloqueo (PIN)'}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[
              styles.option,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
            onPress={handleDisableLock}
          >
            <Text style={[styles.optionText, { color: colors.red }]}>
              <Icon name="lock-open-outline" size={iconSize.sm} color={colors.red} /> Desactivar bloqueo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
            onPress={lockApp}
          >
            <Text style={[styles.optionText, { color: colors.text }]}>
              <Icon name="lock-outline" size={iconSize.sm} color={colors.text} /> Bloquear app ahora
            </Text>
          </TouchableOpacity>
        </>
      )}

      {showPinSetup && (
        <View
          style={[
            styles.pinSetup,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.pinLabel, { color: colors.text }]}>
            Crea un PIN de 4-6 dígitos
          </Text>
          <TextInput
            style={[
              styles.pinInput,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.inputBg,
              },
            ]}
            placeholder="PIN"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={pinInput}
            onChangeText={setPinInput}
          />
          <View style={styles.pinButtons}>
            <Button title="Cancelar" onPress={() => setShowPinSetup(false)} variant="ghost" />
            <Button title="Guardar" onPress={handleSetupPin} />
          </View>
        </View>
      )}

      <View style={styles.spacer} />

      <Button title="Cerrar sesión" onPress={handleLogout} variant="danger" />
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
  pinSetup: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  pinButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
