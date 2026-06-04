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
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import type { Goal } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type GoalsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GoalForm {
  name: string;
  targetAmount: string;
}

export default function GoalsScreen() {
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
    mutationFn: async (payload: { name: string; targetAmount: number }) => {
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
    defaultValues: { name: '', targetAmount: '' },
  });

  const onSubmit = (data: GoalForm) => {
    createMutation.mutate({
      name: data.name,
      targetAmount: Number(data.targetAmount),
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
    <View style={styles.container}>
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
        ListEmptyComponent={<Text style={styles.empty}>No hay metas</Text>}
      />

      <Button title="+ Nueva meta" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva meta</Text>

            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Nombre" value={value} onChangeText={onChange} />
              )}
            />

            <Controller
              control={control}
              name="targetAmount"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Monto objetivo"
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            <Button
              title={createMutation.isPending ? 'Guardando...' : 'Guardar'}
              onPress={handleSubmit(onSubmit)}
              disabled={createMutation.isPending}
            />
            <View style={{ marginTop: 8 }}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} color="#888" />
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
    backgroundColor: '#fff',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
});
