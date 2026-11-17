import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { iconSize } from '../theme/tokens';
import { useToast } from '../hooks/useToast';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import Button from '../components/Button';
import DateField, { todayIso } from '../components/DateField';
import type { Category } from '../types';

type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
type TxType = 'INCOME' | 'EXPENSE';

interface Recurring {
  id: string;
  amount: number | string;
  type: TxType;
  category: string;
  note?: string | null;
  frequency: Frequency | 'DAILY';
  startDate: string;
  isActive: boolean;
}

const FREQ_LABEL: Record<Recurring['frequency'], string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

/** Renta, suscripciones, sueldo...: el backend los registra solos cada periodo. */
export default function RecurringScreen() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [formVisible, setFormVisible] = useState(false);
  const [type, setType] = useState<TxType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [startDate, setStartDate] = useState(todayIso());

  const { data, isLoading, isError, refetch } = useQuery<Recurring[]>({
    queryKey: ['recurring'],
    queryFn: async () => (await api.get('/recurring-transactions')).data,
  });
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await api.get('/categories')).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['recurring'] });
  const onError = (err: any) => Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar');

  const create = useMutation({
    mutationFn: () =>
      api.post('/recurring-transactions', {
        amount: Number(amount.replace(',', '.')),
        type,
        category: category.trim(),
        note: note.trim() || undefined,
        frequency,
        startDate,
      }),
    onSuccess: () => {
      invalidate();
      setFormVisible(false);
      showToast('Gasto fijo guardado');
    },
    onError,
  });
  const toggle = useMutation({
    mutationFn: (r: Recurring) => api.patch(`/recurring-transactions/${r.id}`, { isActive: !r.isActive }),
    onSuccess: invalidate,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-transactions/${id}`),
    onSuccess: invalidate,
    onError,
  });

  const openForm = () => {
    setType('EXPENSE');
    setAmount('');
    setCategory('');
    setNote('');
    setFrequency('MONTHLY');
    setStartDate(todayIso());
    setFormVisible(true);
  };

  const submit = () => {
    if (!(Number(amount.replace(',', '.')) > 0) || !category.trim()) {
      Alert.alert('Faltan datos', 'Escribe el monto y la categoría.');
      return;
    }
    create.mutate();
  };

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorMessage message="No se pudieron cargar los gastos fijos." onRetry={refetch} />;

  const chip = (selected: boolean) => [
    styles.chip,
    { backgroundColor: colors.bgSecondary, borderColor: colors.border },
    selected && { backgroundColor: colors.greenLight, borderColor: colors.green },
  ];
  const suggestions = (categories ?? []).filter(c => c.type === type || c.type === 'BOTH');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={data}
        keyExtractor={r => r.id}
        ListHeaderComponent={
          <Text style={[styles.help, { color: colors.textSecondary }]}>
            Se registran solos cada periodo, a partir de la fecha de inicio.
          </Text>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>Aún no tienes gastos fijos.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, { color: item.isActive ? colors.text : colors.textMuted }]}>
                {item.category} · ${Number(item.amount).toLocaleString('es-MX')}
              </Text>
              <Text style={[styles.rowSub, { color: item.type === 'INCOME' ? colors.green : colors.textSecondary }]}>
                {FREQ_LABEL[item.frequency]} · {item.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                {item.note ? ` · ${item.note}` : ''}
              </Text>
            </View>
            <Switch value={item.isActive} onValueChange={() => toggle.mutate(item)} />
            <TouchableOpacity
              style={styles.delete}
              onPress={() =>
                Alert.alert('Eliminar', `¿Eliminar "${item.category}"? Lo ya registrado se queda.`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(item.id) },
                ])
              }
            >
              <Icon name="trash-can-outline" size={iconSize.md} color={colors.red} />
            </TouchableOpacity>
          </View>
        )}
      />
      <Button title="+ Agregar gasto fijo" onPress={openForm} />

      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={() => setFormVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]}>
          <ScrollView style={[styles.sheet, { backgroundColor: colors.bg }]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: colors.text }]}>Nuevo gasto fijo</Text>
            <View style={styles.chips}>
              {(['EXPENSE', 'INCOME'] as TxType[]).map(t => (
                <TouchableOpacity key={t} style={chip(type === t)} onPress={() => setType(t)}>
                  <Text style={{ color: colors.text }}>{t === 'EXPENSE' ? 'Gasto' : 'Ingreso'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Monto"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Categoría (ej. Renta, Netflix)"
              placeholderTextColor={colors.textMuted}
              value={category}
              onChangeText={setCategory}
            />
            {suggestions.length > 0 && (
              <View style={styles.chips}>
                {suggestions.slice(0, 8).map(c => (
                  <TouchableOpacity key={c.id} style={chip(category === c.name)} onPress={() => setCategory(c.name)}>
                    <Text style={{ color: colors.text }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Nota (opcional)"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.chips}>
              {(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'] as Frequency[]).map(f => (
                <TouchableOpacity key={f} style={chip(frequency === f)} onPress={() => setFrequency(f)}>
                  <Text style={{ color: colors.text }}>{FREQ_LABEL[f]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <DateField value={startDate} onChange={setStartDate} label="Empieza" />
            <Button title="Guardar" onPress={submit} loading={create.isPending} />
            <Button title="Cancelar" onPress={() => setFormVisible(false)} variant="ghost" />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  help: { fontSize: 13, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 2 },
  delete: { padding: 8 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
});
