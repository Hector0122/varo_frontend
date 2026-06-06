import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../services/api';
import GoalCard from '../components/GoalCard';
import { useTheme } from '../theme/ThemeContext';
import type { Goal } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type GoalsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GoalForm {
  name: string;
  targetAmount: string;
  savingAllocation: string;
}

export default function GoalsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<GoalsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await api.get('/goals');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; targetAmount: number; savingAllocation: number }) => {
      const res = await api.post('/goals', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setModalVisible(false);
      reset();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo crear la meta');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
    },
  });

  const { control, handleSubmit, reset } = useForm<GoalForm>({
    defaultValues: { name: '', targetAmount: '', savingAllocation: '100' },
  });

  const onSubmit = (data: GoalForm) => {
    createMutation.mutate({
      name: data.name,
      targetAmount: Number(data.targetAmount),
      savingAllocation: Number(data.savingAllocation) || 100,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
            onLongPress={() => {
              Alert.alert('Eliminar', '¿Eliminar esta meta?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
              ]);
            }}
          >
            <GoalCard goal={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textTertiary }]}>No hay metas</Text>}
      />

      <Button title="+ Nueva meta" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.bgModalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva meta</Text>

            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textMuted} placeholder="Ej: Viaje a Europa" value={value} onChangeText={onChange} />
                </>
              )}
            />

            <Controller
              control={control}
              name="targetAmount"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Monto objetivo</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Ej: 50000"
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={onChange}
                  />
                </>
              )}
            />

            <Controller
              control={control}
              name="savingAllocation"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>% de tu ahorro para esta meta</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="100"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                  <Text style={[styles.hint, { color: colors.textTertiary }]}>Ej: 50% = destinas la mitad de tu ahorro mensual a esta meta</Text>
                </>
              )}
            />

            <Button
              title={createMutation.isPending ? 'Guardando...' : 'Guardar'}
              onPress={handleSubmit(onSubmit)}
              disabled={createMutation.isPending}
            />
            <View style={styles.cancelBtn}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} color={colors.textTertiary} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  hint: {
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
  },
  cancelBtn: {
    marginTop: 8,
  },
});
