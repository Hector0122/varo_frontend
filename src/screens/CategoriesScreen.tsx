import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import ErrorMessage from '../components/ErrorMessage';
import LoadingScreen from '../components/LoadingScreen';
import Button from '../components/Button';
import type { Category } from '../types';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'INCOME' | 'EXPENSE' | 'BOTH'>('EXPENSE');

  const { data: categories, isLoading, isError, refetch } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; type: string }) => {
      const res = await api.post('/categories', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setModalVisible(false);
      setNewName('');
      showToast('Categoría creada');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo crear');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría eliminada');
    },
  });

  const typeColors: Record<string, string> = {
    INCOME: colors.green,
    EXPENSE: colors.red,
    BOTH: colors.yellow,
  };

  const typeLabels: Record<string, string> = {
    INCOME: 'Ingreso',
    EXPENSE: 'Gasto',
    BOTH: 'Ambos',
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ErrorMessage
          message="No se pudieron cargar las categorías."
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rowType, { color: typeColors[item.type] }]}>
                {typeLabels[item.type]}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Eliminar', `¿Eliminar "${item.name}"?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                ]);
              }}
            >
              <Text style={[styles.deleteIcon, { color: colors.red }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            {isLoading ? 'Cargando...' : 'Sin categorías. Crea una nueva.'}
          </Text>
        }
      />

      <Button title="+ Nueva categoría" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalOverlay, { backgroundColor: colors.bgModalOverlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva categoría</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={colors.textMuted}
              placeholder="Ej: Comida"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
            <View style={styles.typeRow}>
              {(['INCOME', 'EXPENSE', 'BOTH'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, { borderColor: colors.border }, newType === t && { backgroundColor: colors.greenLight, borderColor: colors.green }]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.typeText, { color: colors.textSecondary }, newType === t && { color: colors.green, ...styles.fontWeight600 }]}>
                    {typeLabels[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Guardar"
              onPress={() => {
                if (!newName.trim()) return;
                createMutation.mutate({ name: newName.trim(), type: newType });
              }}
              disabled={!newName.trim()}
              loading={createMutation.isPending}
            />
            <View style={styles.cancelBtn}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} variant="ghost" />
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowType: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  deleteIcon: {
    fontSize: 18,
    padding: 8,
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
  typeRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 13,
  },
  cancelBtn: {
    marginTop: 8,
  },
  fontWeight600: {
    fontWeight: '600',
  },
  flexFill: {
    flex: 1,
  },
});
