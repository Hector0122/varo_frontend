import React, { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { api } from '../services/api';
import TransactionItem from '../components/TransactionItem';
import TransactionForm from '../components/TransactionForm';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
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
  const { showToast } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  // scanned data uses individual state vars below
  const [scanLoading, setScanLoading] = useState(false);

  // Estados editables del preview de ticket escaneado
  const [scanAmount, setScanAmount] = useState('');
  const [scanCategory, setScanCategory] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [scanDate, setScanDate] = useState('');
  const [scanType, setScanType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  // Filtros y ordenamiento
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>(
    'ALL',
  );
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [refreshing, setRefreshing] = useState(false);
  const {
    data: transactions,
    isLoading,
    isError,
    refetch,
  } = useQuery<Transaction[]>({
    queryKey: ['transactions', filterType, filterCategory, sortBy, sortOrder],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterType !== 'ALL') params.type = filterType;
      if (filterCategory) params.category = filterCategory;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
      const res = await api.get('/transactions', { params });
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
      const exists = categories?.some(c => c.name === variables.category);
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
      showToast('Movimiento guardado');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Transaction>;
    }) => {
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
      showToast('Movimiento actualizado');
    },
    onError: (err: any) => {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'No se pudo actualizar',
      );
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
      showToast('Movimiento eliminado');
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

  const { data: allCategories } = useQuery<Category[]>({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
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
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.5 as const,
    };

    const launcher = fromCamera ? launchCamera : launchImageLibrary;

    launcher(options, async response => {
      if (
        response.didCancel ||
        response.errorCode ||
        !response.assets?.[0]?.base64
      ) {
        return;
      }
      const base64 = response.assets[0].base64;
      const mimeType = response.assets[0].type || 'image/jpeg';
      const imageUri = `data:${mimeType};base64,${base64}`;

      // Validar tamaño antes de consumir el tier gratuito de Groq
      const sizeMB = imageUri.length / (1024 * 1024);
      if (sizeMB > 1.5) {
        Alert.alert(
          'Imagen muy grande',
          `La imagen pesa ${sizeMB.toFixed(
            1,
          )}MB. Intenta sacarla más cercana al ticket o con menos resolución.`,
        );
        return;
      }

      setScanLoading(true);
      try {
        const res = await api.post('/transactions/scan-receipt', {
          image: imageUri,
        });
        const data = res.data as ScannedReceipt;
        setScanAmount(String(data.amount ?? ''));
        setScanCategory(data.category ?? '');
        setScanNote(data.note ?? '');
        setScanDate(data.date ?? new Date().toISOString().split('T')[0]);
        setScanType(data.type ?? 'EXPENSE');
        setScanModalVisible(true);
      } catch (err: any) {
        Alert.alert(
          'Error',
          err.response?.data?.message || 'No se pudo procesar el ticket',
        );
      } finally {
        setScanLoading(false);
      }
    });
  };

  const confirmScanned = () => {
    if (!scanAmount || !scanCategory || !scanDate) {
      Alert.alert(
        'Faltan datos',
        'Completa al menos el monto, categoría y fecha.',
      );
      return;
    }
    createMutation.mutate({
      amount: Number(scanAmount),
      category: scanCategory,
      note: scanNote || undefined,
      type: scanType,
      date: new Date(scanDate).toISOString(),
    });
    setScanModalVisible(false);
    setScanAmount('');
    setScanCategory('');
    setScanNote('');
    setScanDate('');
    setScanType('EXPENSE');
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fabAnim, {
        toValue: fabMenuVisible ? 1 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.spring(fabRotate, {
        toValue: fabMenuVisible ? 1 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
    ]).start();
  }, [fabMenuVisible, fabAnim, fabRotate]);

  const fabRotation = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const showActionMenu = (tx: Transaction) => {
    Alert.alert('Movimiento', `${tx.category} - $${tx.amount}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: () => openEdit(tx) },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(tx.id),
      },
    ]);
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refetch();
              setRefreshing(false);
            }}
            tintColor={colors.green}
          />
        }
        ListHeaderComponent={
          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.bgSecondary,
                    },
                    filterType === t && {
                      backgroundColor: colors.green,
                      borderColor: colors.green,
                    },
                  ]}
                  onPress={() => setFilterType(t)}
                >
                  <Text
                    style={[
                      { color: colors.text },
                      filterType === t && { color: colors.bg, ...styles.fontWeight600 },
                    ]}
                  >
                    {t === 'ALL'
                      ? 'Todos'
                      : t === 'INCOME'
                      ? 'Ingresos'
                      : 'Gastos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sortRow}>
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => {
                  if (sortBy === 'date') {
                    setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'));
                  } else {
                    setSortBy('date');
                    setSortOrder('desc');
                  }
                }}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    { color: colors.textSecondary },
                    sortBy === 'date' && { color: colors.green, ...styles.fontWeight700 },
                  ]}
                >
                  Fecha{' '}
                  {sortBy === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => {
                  if (sortBy === 'amount') {
                    setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'));
                  } else {
                    setSortBy('amount');
                    setSortOrder('desc');
                  }
                }}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    { color: colors.textSecondary },
                    sortBy === 'amount' && { color: colors.green, ...styles.fontWeight700 },
                  ]}
                >
                  Monto{' '}
                  {sortBy === 'amount'
                    ? sortOrder === 'desc'
                      ? '↓'
                      : '↑'
                    : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {allCategories && allCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.bgSecondary,
                    },
                    filterCategory === '' && {
                      backgroundColor: colors.green,
                      borderColor: colors.green,
                    },
                  ]}
                  onPress={() => setFilterCategory('')}
                >
                  <Text
                    style={[
                      { color: colors.text },
                      filterCategory === '' && { color: colors.bg, ...styles.fontWeight600 },
                    ]}
                  >
                    Todas
                  </Text>
                </TouchableOpacity>
                {allCategories
                  .filter(
                    c =>
                      filterType === 'ALL' ||
                      c.type === filterType ||
                      c.type === 'BOTH',
                  )
                  .map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.bgSecondary,
                        },
                        filterCategory === c.name && {
                          backgroundColor: colors.green,
                          borderColor: colors.green,
                        },
                      ]}
                      onPress={() =>
                        setFilterCategory(prev =>
                          prev === c.name ? '' : c.name,
                        )
                      }
                    >
                      <Text
                        style={[
                          { color: colors.text },
                          filterCategory === c.name && { color: colors.bg, ...styles.fontWeight600 },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: colors.border }]}
              onPress={async () => {
                try {
                  const res = await api.get('/transactions/export/csv', {
                    responseType: 'text',
                  });
                  const csv = res.data;
                  const date = new Date().toISOString().split('T')[0];
                  const fileName = `varo-transacciones-${date}.csv`;
                  const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
                  await RNFS.writeFile(filePath, csv, 'utf8');
                  await Share.open({
                    url: `file://${filePath}`,
                    type: 'text/csv',
                    title: fileName,
                    subject: `Exportación Varo - ${fileName}`,
                    message: 'Tus movimientos financieros exportados desde Varo',
                  });
                } catch (err: any) {
                  if (err?.message !== 'User did not share') {
                    Alert.alert('Error', 'No se pudo exportar: ' + (err.message || 'Error desconocido'));
                  }
                }
              }}
            >
              <Text style={[styles.exportBtnText, { color: colors.green }]}>
                📤 Exportar CSV
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => showActionMenu(item)}>
            <TransactionItem transaction={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Sin movimientos
            </Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Registra tu primer ingreso o gasto.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.green }]}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
        activeOpacity={0.8}
      >
        <Animated.Text
          style={[
            styles.fabText,
            { color: colors.bg, transform: [{ rotate: fabRotation }] },
          ]}
        >
          +
        </Animated.Text>
      </TouchableOpacity>

      {/* FAB Menu */}
      {[1, 2, 3].map((_, i) => {
        const items = [
          {
            label: '✍️ Nuevo manual',
            onPress: () => {
              setFabMenuVisible(false);
              setModalVisible(true);
            },
          },
          { label: '🖼️ Escanear de galería', onPress: () => pickImage(false) },
          { label: '📸 Escanear con cámara', onPress: () => pickImage(true) },
        ];
        const item = items[i];
        const translateY = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20 * (i + 1), 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.fabMenuItemWrapper,
              {
                opacity: fabAnim,
                transform: [{ translateY }],
                bottom: 84 + i * 52,
              },
            ]}
            pointerEvents={fabMenuVisible ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={[styles.fabMenuItem, { backgroundColor: colors.bgCard }]}
              onPress={item.onPress}
            >
              <Text style={[styles.fabMenuText, { color: colors.text }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Scan loading overlay */}
      {scanLoading && (
        <View
          style={[
            styles.scanOverlay,
            { backgroundColor: colors.bgModalOverlay },
          ]}
        >
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.scanText, { color: colors.text }]}>
            Analizando ticket...
          </Text>
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.flexFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: colors.bgModalOverlay },
            ]}
          >
            <ScrollView
              style={[styles.modalContent, { backgroundColor: colors.bg }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nuevo movimiento
              </Text>
              <TransactionForm
                control={control}
                selectedType={selectedType}
                categories={categories}
                showCategoryInput={showCategoryInput}
                setShowCategoryInput={setShowCategoryInput}
                onSubmit={handleSubmit(onSubmit)}
                onCancel={() => {
                  setModalVisible(false);
                  setEditModalVisible(false);
                  setShowCategoryInput(false);
                  reset();
                  setEditingTransaction(null);
                }}
                isPending={createMutation.isPending || updateMutation.isPending}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.flexFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: colors.bgModalOverlay },
            ]}
          >
            <ScrollView
              style={[styles.modalContent, { backgroundColor: colors.bg }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Editar movimiento
              </Text>
              <TransactionForm
                control={control}
                selectedType={selectedType}
                categories={categories}
                showCategoryInput={showCategoryInput}
                setShowCategoryInput={setShowCategoryInput}
                onSubmit={handleSubmit(onEditSubmit)}
                onCancel={() => {
                  setModalVisible(false);
                  setEditModalVisible(false);
                  setShowCategoryInput(false);
                  reset();
                  setEditingTransaction(null);
                }}
                isPending={createMutation.isPending || updateMutation.isPending}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scan Preview Modal - EDITABLE */}
      <Modal visible={scanModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.flexFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: colors.bgModalOverlay },
            ]}
          >
            <ScrollView
              style={[styles.modalContent, { backgroundColor: colors.bg }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Ticket detectado
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Monto
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Ej: 500"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={scanAmount}
                onChangeText={setScanAmount}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Categoría
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Ej: Supermercado, Comida..."
                placeholderTextColor={colors.textMuted}
                value={scanCategory}
                onChangeText={setScanCategory}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Lugar / Establecimiento
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Ej: Walmart, Starbucks..."
                placeholderTextColor={colors.textMuted}
                value={scanNote}
                onChangeText={setScanNote}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Fecha
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={scanDate}
                onChangeText={setScanDate}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Tipo
              </Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { borderColor: colors.border },
                    scanType === 'INCOME' && {
                      backgroundColor: colors.greenLight,
                      borderColor: colors.green,
                    },
                  ]}
                  onPress={() => setScanType('INCOME')}
                >
                  <Text>💰 Ingreso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { borderColor: colors.border },
                    scanType === 'EXPENSE' && {
                      backgroundColor: colors.greenLight,
                      borderColor: colors.green,
                    },
                  ]}
                  onPress={() => setScanType('EXPENSE')}
                >
                  <Text>💸 Gasto</Text>
                </TouchableOpacity>
              </View>

              <Button
                title={
                  createMutation.isPending
                    ? 'Guardando...'
                    : '✅ Confirmar y guardar'
                }
                onPress={confirmScanned}
                disabled={createMutation.isPending}
              />
              <View style={styles.cancelBtn}>
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setScanModalVisible(false);
                    setScanAmount('');
                    setScanCategory('');
                    setScanNote('');
                    setScanDate('');
                    setScanType('EXPENSE');
                  }}
                  color={colors.textTertiary}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    paddingRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 13,
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
  fabMenuItemWrapper: {
    position: 'absolute',
    right: 20,
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
  cancelBtn: {
    marginTop: 8,
  },
  filterSection: {
    marginBottom: 8,
    gap: 6,
  },
  filterRow: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sortBtn: {
    paddingVertical: 2,
  },
  sortBtnText: {
    fontSize: 13,
  },
  fontWeight700: {
    fontWeight: '700',
  },
  fontWeight600: {
    fontWeight: '600',
  },
  flexFill: {
    flex: 1,
  },
  exportBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
