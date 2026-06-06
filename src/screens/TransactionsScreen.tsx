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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { api } from '../services/api';
import TransactionItem from '../components/TransactionItem';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import type { Transaction, Category } from '../types';

interface TransactionForm {
  amount: string;
  category: string;
  note: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
}

interface ScannedReceipt {
  amount: number;
  category: string;
  note: string;
  date: string;
  type: 'EXPENSE';
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [scannedData, setScannedData] = useState<ScannedReceipt | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const { data: transactions, isLoading, isError, refetch } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; type: string }) => {
      const res = await api.post('/categories', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Transaction, 'id' | 'userId'>) => {
      const res = await api.post('/transactions', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
      const exists = categories?.some((c) => c.name === variables.category);
      if (!exists) {
        createCategoryMutation.mutate({
          name: variables.category,
          type: variables.type,
        });
      }
      setModalVisible(false);
      setEditModalVisible(false);
      setShowCategoryInput(false);
      reset();
      setEditingTransaction(null);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Transaction> }) => {
      const res = await api.patch(`/transactions/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
      setEditModalVisible(false);
      setEditingTransaction(null);
      reset();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar');
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

  const { control, handleSubmit, reset, setValue } = useForm<TransactionForm>({
    defaultValues: {
      amount: '',
      category: '',
      note: '',
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedType = useWatch({ control, name: 'type' });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', selectedType],
    queryFn: async () => {
      const res = await api.get(`/categories?type=${selectedType}`);
      return res.data;
    },
  });

  const filteredTags = categories?.filter(
    (c) => c.type === selectedType || c.type === 'BOTH',
  );

  const onSubmit = (data: TransactionForm) => {
    createMutation.mutate({
      amount: Number(data.amount),
      category: data.category,
      note: data.note || undefined,
      type: data.type,
      date: new Date(data.date).toISOString(),
    });
  };

  const onEditSubmit = (data: TransactionForm) => {
    if (!editingTransaction) return;
    updateMutation.mutate({
      id: editingTransaction.id,
      payload: {
        amount: Number(data.amount),
        category: data.category,
        note: data.note || undefined,
        type: data.type,
        date: new Date(data.date).toISOString(),
      },
    });
  };

  const openEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setValue('amount', String(tx.amount));
    setValue('category', tx.category);
    setValue('note', tx.note || '');
    setValue('type', tx.type);
    setValue('date', new Date(tx.date).toISOString().split('T')[0]);
    setEditModalVisible(true);
  };

  const pickImage = (fromCamera: boolean) => {
    setFabMenuVisible(false);
    const options = {
      mediaType: 'photo' as const,
      includeBase64: true,
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8 as const,
    };

    const launcher = fromCamera ? launchCamera : launchImageLibrary;

    launcher(options, async (response) => {
      if (response.didCancel || response.errorCode || !response.assets?.[0]?.base64) {
        return;
      }
      const base64 = response.assets[0].base64;
      const mimeType = response.assets[0].type || 'image/jpeg';
      const imageUri = `data:${mimeType};base64,${base64}`;

      setScanLoading(true);
      try {
        const res = await api.post('/transactions/scan-receipt', { image: imageUri });
        setScannedData(res.data);
        setScanModalVisible(true);
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'No se pudo procesar el ticket');
      } finally {
        setScanLoading(false);
      }
    });
  };

  const confirmScanned = () => {
    if (!scannedData) return;
    createMutation.mutate({
      amount: scannedData.amount,
      category: scannedData.category,
      note: scannedData.note || undefined,
      type: scannedData.type,
      date: new Date(scannedData.date).toISOString(),
    });
    setScanModalVisible(false);
    setScannedData(null);
  };

  const showActionMenu = (tx: Transaction) => {
    Alert.alert(
      'Movimiento',
      `${tx.category} - $${tx.amount}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Editar', onPress: () => openEdit(tx) },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(tx.id) },
      ],
    );
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

  const renderForm = (onFormSubmit: (data: TransactionForm) => void, isEditing: boolean) => (
    <>
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, { borderColor: colors.border }, value === 'INCOME' && { backgroundColor: colors.greenLight, borderColor: colors.green }]}
                onPress={() => onChange('INCOME')}
              >
                <Text>💰 Ingreso</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, { borderColor: colors.border }, value === 'EXPENSE' && { backgroundColor: colors.greenLight, borderColor: colors.green }]}
                onPress={() => onChange('EXPENSE')}
              >
                <Text>💸 Gasto</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      />

      <Controller
        control={control}
        name="amount"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Monto</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Ej: 500"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
            />
          </>
        )}
      />

      <Controller
        control={control}
        name="category"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
            {filteredTags && filteredTags.length > 0 && !showCategoryInput && (
              <View style={styles.tagRow}>
                {filteredTags.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.tag, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, value === cat.name && { backgroundColor: colors.greenLight, borderColor: colors.green }]}
                    onPress={() => onChange(cat.name)}
                  >
                    <Text style={[styles.tagText, { color: colors.textSecondary }, value === cat.name && { color: colors.green, fontWeight: '600' }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.tagAdd, { backgroundColor: colors.bg, borderColor: colors.green }]}
                  onPress={() => setShowCategoryInput(true)}
                >
                  <Text style={[styles.tagAddText, { color: colors.green }]}>+</Text>
                </TouchableOpacity>
              </View>
            )}
            {(showCategoryInput || !filteredTags || filteredTags.length === 0) && (
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Ej: Comida, Transporte, Sueldo..."
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChange}
              />
            )}
            {showCategoryInput && (
              <TouchableOpacity onPress={() => setShowCategoryInput(false)}>
                <Text style={[styles.backToTags, { color: colors.green }]}>← Ver categorías guardadas</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      />

      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nota</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textMuted} placeholder="Opcional: descripción del movimiento" value={value} onChangeText={onChange} />
          </>
        )}
      />

      <Controller
        control={control}
        name="date"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholderTextColor={colors.textMuted} placeholder="2026-06-06" value={value} onChangeText={onChange} />
          </>
        )}
      />

      <Button
        title={createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
        onPress={handleSubmit(onFormSubmit)}
        disabled={createMutation.isPending || updateMutation.isPending}
      />
      <View style={styles.cancelBtn}>
        <Button
          title="Cancelar"
          onPress={() => {
            setModalVisible(false);
            setEditModalVisible(false);
            setShowCategoryInput(false);
            reset();
            setEditingTransaction(null);
          }}
          color={colors.textTertiary}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => showActionMenu(item)}>
            <TransactionItem transaction={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sin movimientos</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Registra tu primer ingreso o gasto.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.green }]}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
      >
        <Text style={[styles.fabText, { color: colors.bg }]}>+</Text>
      </TouchableOpacity>

      {/* FAB Menu */}
      {fabMenuVisible && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: colors.bgCard }]}
            onPress={() => {
              setFabMenuVisible(false);
              setModalVisible(true);
            }}
          >
            <Text style={[styles.fabMenuText, { color: colors.text }]}>✍️ Nuevo manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: colors.bgCard }]}
            onPress={() => pickImage(false)}
          >
            <Text style={[styles.fabMenuText, { color: colors.text }]}>🖼️ Escanear de galería</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: colors.bgCard }]}
            onPress={() => pickImage(true)}
          >
            <Text style={[styles.fabMenuText, { color: colors.text }]}>📸 Escanear con cámara</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scan loading overlay */}
      {scanLoading && (
        <View style={styles.scanOverlay}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.scanText, { color: colors.text }]}>Analizando ticket...</Text>
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.bgModalOverlay }]}>
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo movimiento</Text>
            {renderForm(onSubmit, false)}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.bgModalOverlay }]}>
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar movimiento</Text>
            {renderForm(onEditSubmit, true)}
          </ScrollView>
        </View>
      </Modal>

      {/* Scan Preview Modal */}
      <Modal visible={scanModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.bgModalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ticket detectado</Text>
            {scannedData && (
              <View style={styles.scanPreview}>
                <Text style={[styles.scanLabel, { color: colors.textSecondary }]}>Monto</Text>
                <Text style={[styles.scanValue, { color: colors.text }]}>${scannedData.amount}</Text>

                <Text style={[styles.scanLabel, { color: colors.textSecondary }]}>Categoría</Text>
                <Text style={[styles.scanValue, { color: colors.text }]}>{scannedData.category}</Text>

                <Text style={[styles.scanLabel, { color: colors.textSecondary }]}>Nota</Text>
                <Text style={[styles.scanValue, { color: colors.text }]}>{scannedData.note || '-'}</Text>

                <Text style={[styles.scanLabel, { color: colors.textSecondary }]}>Fecha</Text>
                <Text style={[styles.scanValue, { color: colors.text }]}>{scannedData.date}</Text>
              </View>
            )}
            <Button
              title={createMutation.isPending ? 'Guardando...' : '✅ Confirmar y guardar'}
              onPress={confirmScanned}
              disabled={createMutation.isPending}
            />
            <View style={styles.cancelBtn}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setScanModalVisible(false);
                  setScannedData(null);
                }}
                color={colors.textTertiary}
              />
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
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  fabText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    gap: 8,
    zIndex: 9,
  },
  fabMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
  },
  scanText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    maxHeight: '85%',
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
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
  },
  tagAdd: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  tagAddText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToTags: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
  },
  cancelBtn: {
    marginTop: 8,
  },
  scanPreview: {
    marginBottom: 16,
  },
  scanLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  scanValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});
