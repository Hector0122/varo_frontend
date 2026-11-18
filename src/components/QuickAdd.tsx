import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { objectivesApi } from '../services/objectives';
import { api } from '../services/api';
import { flushQueue, saveTransaction } from '../services/transactionQueue';
import { sortByFrequency } from '../utils/frequency';
import { categoryStyle } from '../utils/categoryStyle';
import { isLinkedCategory } from '../constants/systemCategories';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import DateField, { todayIso } from './DateField';
import Button from './Button';
import type { Category, FinancialObjective, Transaction } from '../types';

const PAID_WITH_KEY = 'quickadd:paidWith';

type TxType = 'INCOME' | 'EXPENSE';
interface OpenOptions {
  category?: string;
  type?: TxType;
  /** Prellenado (ticket escaneado). */
  amount?: number;
  note?: string;
  date?: string;
  /** Editar un movimiento existente. */
  edit?: Transaction;
}

const QuickAddContext = createContext<{ open: (o?: OpenOptions) => void }>({ open: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);

const VISIBLE_CHIPS = 8;
const parseAmount = (s: string) => Number(s.replace(',', '.'));

/**
 * Registro rápido: monto con el teclado ya abierto y tus categorías frecuentes.
 * Con monto escrito, tocar una categoría guarda de una vez.
 * Se abre desde Inicio, el botón + de Movimientos, el atajo del ícono y el widget
 * (deep link varo://gasto?categoria=X).
 */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const amountRef = useRef<TextInput>(null);

  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<TxType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [details, setDetails] = useState(false);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [paidWith, setPaidWith] = useState<string | null>(null); // id de tarjeta, 'account' (débito de la cuenta principal) o 'cash'

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await api.get('/categories')).data,
  });
  // Misma llave que el Dashboard: comparten caché.
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/transactions')).data,
  });

  const { data: cards } = useQuery<FinancialObjective[]>({
    queryKey: ['debts'],
    queryFn: () => objectivesApi.list('DEBT_PAYOFF'),
  });
  // Misma llave que Proyección: la cuenta principal (p. ej. Mercado Pago).
  const { data: accounts } = useQuery<FinancialObjective[]>({
    queryKey: ['accounts'],
    queryFn: () => objectivesApi.list('SAVING_GOAL'),
  });
  const account = accounts?.[0];
  // Con qué pagaste: se recuerda el último; si no hay, la tarjeta BBVA o la primera.
  useEffect(() => {
    AsyncStorage.getItem(PAID_WITH_KEY)
      .then(v => setPaidWith(p => p ?? v))
      .catch(() => {});
  }, []);
  const paidWithValid =
    paidWith === 'cash' || (paidWith === 'account' && !!account) || cards?.some(c => c.id === paidWith)
      ? (paidWith as string)
      : (cards?.find(c => /bbva/i.test(c.name)) ?? cards?.[0])?.id ?? 'cash';
  const choosePaidWith = (v: string) => {
    setPaidWith(v);
    AsyncStorage.setItem(PAID_WITH_KEY, v).catch(() => {});
  };
  const showPaidWith = !editing && type === 'EXPENSE' && !!cards?.length;

  const sorted = useCallback(
    (t: TxType) =>
      sortByFrequency(
        (categories ?? []).filter(c => c.type === t || c.type === 'BOTH').map(c => c.name),
        transactions ?? [],
        t,
      ),
    [categories, transactions],
  );
  const chips = useMemo(() => sorted(type), [sorted, type]);

  const open = useCallback((o: OpenOptions = {}) => {
    const tx = o.edit;
    setEditing(tx ?? null);
    setType(tx?.type ?? o.type ?? 'EXPENSE');
    const amt = tx ? Number(tx.amount) : o.amount;
    setAmount(amt ? String(amt) : '');
    setCategory(tx?.category ?? o.category ?? '');
    setNewCategory(false);
    setShowAll(false);
    const n = tx?.note ?? o.note ?? '';
    const d = tx ? tx.date.slice(0, 10) : o.date ?? todayIso();
    setNote(n);
    setDate(d);
    setDetails(!!n || d !== todayIso());
    setVisible(true);
  }, []);

  // Deep links: atajo del ícono y widget.
  useEffect(() => {
    const handle = (url: string | null) => {
      const m = url?.match(/^varo:\/\/(gasto|ingreso)(?:\?categoria=([^&]*))?/);
      if (m) open({ type: m[1] === 'ingreso' ? 'INCOME' : 'EXPENSE', category: m[2] ? decodeURIComponent(m[2]) : undefined });
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', e => handle(e.url));
    return () => sub.remove();
  }, [open]);

  // Mandar lo que quedó pendiente sin red al abrir o volver a la app.
  useEffect(() => {
    flushQueue(qc);
    const sub = AppState.addEventListener('change', s => s === 'active' && flushQueue(qc));
    return () => sub.remove();
  }, [qc]);

  const save = async (cat = category) => {
    const value = parseAmount(amount);
    const name = cat.trim();
    if (!(value > 0)) {
      amountRef.current?.focus();
      return;
    }
    if (!name) return;
    setSaving(true);
    if (editing) {
      try {
        await api.patch(`/transactions/${editing.id}`, {
          amount: value,
          category: name,
          note: note.trim() || undefined,
          type,
          date,
        });
        for (const key of ['transactions', 'debts', 'monthly-spending']) {
          qc.invalidateQueries({ queryKey: [key] });
        }
        setVisible(false);
        showToast('Movimiento actualizado');
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar');
      } finally {
        setSaving(false);
      }
      return;
    }
    try {
      const result = await saveTransaction(
        { amount: value, category: name, note: note.trim() || undefined, type, date },
        qc,
        showPaidWith && paidWithValid !== 'cash' && paidWithValid !== 'account' ? paidWithValid : undefined,
      );
      if (result === 'saved' && !categories?.some(c => c.name === name)) {
        api.post('/categories', { name, type }).then(() => qc.invalidateQueries({ queryKey: ['categories'] }), () => {});
      }
      setVisible(false);
      showToast(
        result === 'queued'
          ? 'Sin conexión: se enviará al volver la red'
          : `${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'} guardado`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!editing) return;
    const linked = isLinkedCategory(editing.category);
    Alert.alert(
      'Eliminar movimiento',
      linked
        ? 'Se generó desde una deuda o meta: eliminarlo también revierte ese saldo.'
        : `${editing.category} · $${Number(editing.amount).toLocaleString('es-MX')}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/transactions/${editing.id}`);
              for (const key of ['transactions', 'goals', 'forecast', 'debts', 'monthly-spending']) {
                qc.invalidateQueries({ queryKey: [key] });
              }
              setVisible(false);
              showToast('Movimiento eliminado');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo eliminar');
            }
          },
        },
      ],
    );
  };

  const onChip = (name: string) => {
    // Al editar, tocar una categoría solo la elige; al registrar, con monto guarda de una vez.
    if (!editing && parseAmount(amount) > 0) {
      save(name);
    } else {
      setCategory(name);
      amountRef.current?.focus();
    }
  };

  let shown = showAll ? chips : chips.slice(0, VISIBLE_CHIPS);
  // Una categoría que llega por el widget pero aún no está en la lista igual se muestra.
  if (category && !newCategory && !shown.includes(category)) shown = [category, ...shown];

  return (
    <QuickAddContext.Provider value={{ open }}>
      {children}
      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]} onPress={() => setVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.bg }]} onPress={() => {}}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {editing && (
                  <Text style={[styles.title, { color: colors.text }]}>Editar movimiento</Text>
                )}
                <View style={styles.typeRow}>
                  {(['EXPENSE', 'INCOME'] as TxType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setType(t);
                        setCategory('');
                      }}
                      style={[
                        styles.typeBtn,
                        { borderColor: colors.border },
                        type === t && { backgroundColor: colors.greenLight, borderColor: colors.green },
                      ]}
                    >
                      <Text style={{ color: type === t ? colors.green : colors.textSecondary }}>
                        {t === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.amountRow}>
                  <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
                  <TextInput
                    ref={amountRef}
                    autoFocus={!editing}
                    style={[styles.amount, { color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    value={amount}
                    onChangeText={setAmount}
                    onSubmitEditing={() => save()}
                  />
                </View>

                {showPaidWith && (
                  <View style={styles.paidRow}>
                    <Text style={[styles.paidLabel, { color: colors.textSecondary }]}>Pagado con</Text>
                    {[
                      ...cards!.map(c => ({ id: c.id, name: c.name })),
                      ...(account ? [{ id: 'account', name: account.name }] : []),
                      { id: 'cash', name: 'Efectivo' },
                    ].map(o => (
                      <TouchableOpacity
                        key={o.id}
                        onPress={() => choosePaidWith(o.id)}
                        style={[
                          styles.paidChip,
                          { borderColor: colors.border },
                          paidWithValid === o.id && { backgroundColor: colors.greenLight, borderColor: colors.green },
                        ]}
                      >
                        <Text style={{ color: paidWithValid === o.id ? colors.green : colors.textSecondary }}>
                          {o.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {category
                    ? `Categoría: ${category}`
                    : editing
                    ? 'Elige una categoría'
                    : 'Escribe el monto y toca una categoría para guardar'}
                </Text>

                {newCategory ? (
                  <TextInput
                    autoFocus
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder="Nueva categoría"
                    placeholderTextColor={colors.textMuted}
                    value={category}
                    onChangeText={setCategory}
                    returnKeyType="done"
                    onSubmitEditing={() => save()}
                  />
                ) : (
                  <View style={styles.chips}>
                    {shown.map(name => (
                      <TouchableOpacity
                        key={name}
                        onPress={() => onChip(name)}
                        disabled={saving}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                          category === name && { backgroundColor: colors.greenLight, borderColor: colors.green },
                        ]}
                      >
                        <Text style={{ color: category === name ? colors.green : colors.text }}>
                          <Icon name={categoryStyle(name).icon} size={14} color={categoryStyle(name).color} /> {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {!showAll && chips.length > VISIBLE_CHIPS && (
                      <TouchableOpacity onPress={() => setShowAll(true)} style={[styles.chip, { borderColor: colors.border }]}>
                        <Text style={{ color: colors.textSecondary }}>Más…</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setCategory('');
                        setNewCategory(true);
                      }}
                      style={[styles.chip, styles.dashed, { borderColor: colors.green }]}
                    >
                      <Text style={{ color: colors.green }}>+ Nueva</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity onPress={() => setDetails(!details)}>
                  <Text style={[styles.link, { color: colors.green }]}>
                    {details ? 'Ocultar detalles' : 'Nota o fecha'}
                  </Text>
                </TouchableOpacity>
                {details && (
                  <>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                      placeholder="Nota (opcional)"
                      placeholderTextColor={colors.textMuted}
                      value={note}
                      onChangeText={setNote}
                    />
                    <DateField value={date} onChange={setDate} />
                  </>
                )}

                <Button title="Guardar" onPress={() => save()} loading={saving} disabled={!category.trim()} />
                {editing && <Button title="Eliminar" onPress={remove} variant="ghost" />}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </QuickAddContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  paidRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  paidLabel: { fontSize: 13 },
  paidChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  currency: { fontSize: 32, marginRight: 4 },
  amount: { fontSize: 44, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  dashed: { borderStyle: 'dashed' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  link: { fontSize: 13, marginBottom: 12 },
});
