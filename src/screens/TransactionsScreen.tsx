import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../services/api';
import TransactionItem from '../components/TransactionItem';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import type { Transaction } from '../types';

interface TransactionForm {
  amount: string;
  category: string;
  note: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
}

export default function TransactionsScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: transactions, isLoading, isError, refetch } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Transaction, 'id' | 'userId'>) => {
      const res = await api.post('/transactions', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
      setModalVisible(false);
      reset();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
    },
  });

  const { control, handleSubmit, reset } = useForm<TransactionForm>({
    defaultValues: {
      amount: '',
      category: '',
      note: '',
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = (data: TransactionForm) => {
    createMutation.mutate({
      amount: Number(data.amount),
      category: data.category,
      note: data.note || undefined,
      type: data.type,
      date: new Date(data.date).toISOString(),
    });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message="No se pudieron cargar los movimientos."
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => {
              Alert.alert('Eliminar', '¿Eliminar este movimiento?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
              ]);
            }}
          >
            <TransactionItem transaction={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Sin movimientos</Text>
            <Text style={styles.emptyText}>Registra tu primer ingreso o gasto.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo movimiento</Text>

            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, value === 'INCOME' && styles.typeBtnActive]}
                    onPress={() => onChange('INCOME')}
                  >
                    <Text>Ingreso</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, value === 'EXPENSE' && styles.typeBtnActive]}
                    onPress={() => onChange('EXPENSE')}
                  >
                    <Text>Gasto</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <Controller
              control={control}
              name="amount"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Monto"
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="category"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Categoría" value={value} onChangeText={onChange} />
              )}
            />

            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="Nota (opcional)" value={value} onChangeText={onChange} />
              )}
            />

            <Controller
              control={control}
              name="date"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} />
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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
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
  typeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
  },
});
