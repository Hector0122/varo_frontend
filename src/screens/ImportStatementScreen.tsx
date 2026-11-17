import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import { iconSize } from '../theme/tokens';
import { parseIsoDate } from '../components/DateField';
import Button from '../components/Button';
import { isDuplicate } from '../utils/duplicates';
import type { Category, Transaction } from '../types';

interface Row {
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  selected: boolean;
  duplicate: boolean;
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Importa los cargos de un estado de cuenta en PDF. El backend saca los
 * movimientos y sugiere categorías; aquí se revisan antes de guardar.
 * Los abonos (pagos a la tarjeta) y los posibles duplicados vienen desmarcados.
 */
export default function ImportStatementScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/transactions')).data,
  });
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await api.get('/categories')).data,
  });

  const choosePdf = async () => {
    let file;
    try {
      [file] = await pick({ type: [types.pdf] });
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        Alert.alert('Error', 'No se pudo abrir el archivo');
      }
      return;
    }
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name ?? 'estado.pdf', type: 'application/pdf' } as any);
    setLoading(true);
    try {
      const res = await api.post('/transactions/import-statement', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      });
      const data = res.data as Omit<Row, 'selected' | 'duplicate'>[];
      setRows(
        data.map(r => {
          const duplicate = isDuplicate(r, transactions ?? []);
          return { ...r, duplicate, selected: r.type === 'EXPENSE' && !duplicate };
        }),
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo leer el estado de cuenta');
    } finally {
      setLoading(false);
    }
  };

  const selected = useMemo(() => rows?.filter(r => r.selected) ?? [], [rows]);
  const total = selected.reduce((s, r) => s + (r.type === 'EXPENSE' ? r.amount : 0), 0);

  const update = (i: number, patch: Partial<Row>) =>
    setRows(rs => rs && rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // Cambiar la categoría de un movimiento cambia la de todos con la misma descripción.
  const setCategory = (i: number, category: string) => {
    const desc = rows![i].description;
    setRows(rs => rs && rs.map(r => (r.description === desc ? { ...r, category } : r)));
    setEditing(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post('/transactions/bulk', {
        transactions: selected.map(r => ({
          amount: r.amount,
          type: r.type,
          category: r.category,
          note: r.description,
          date: r.date,
        })),
      });
      for (const key of ['transactions', 'categories', 'goals', 'forecast', 'monthly-spending']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      showToast(`${res.data.count} movimientos importados`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={[styles.help, { color: colors.textSecondary }]}>Leyendo el estado de cuenta…</Text>
      </View>
    );
  }

  if (!rows) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Icon name="file-document-outline" size={56} color={colors.green} />
        <Text style={[styles.title, { color: colors.text }]}>Importar estado de cuenta</Text>
        <Text style={[styles.help, { color: colors.textSecondary }]}>
          Elige el PDF que te manda tu banco. Varo saca los cargos y les pone categoría; tú los revisas antes de
          guardar. Tu nombre, dirección y número de cuenta no se envían a la IA.
        </Text>
        <Button title="Elegir PDF" onPress={choosePdf} />
      </View>
    );
  }

  const options = Array.from(
    new Set([
      ...(categories ?? []).filter(c => c.type !== 'INCOME').map(c => c.name),
      ...rows.filter(r => r.type === 'EXPENSE').map(r => r.category),
    ]),
  ).sort();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={
          <Text style={[styles.help, { color: colors.textSecondary }]}>
            {rows.length} movimientos. Toca la categoría para cambiarla. Los abonos y los que ya registraste vienen
            desmarcados.
          </Text>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }, !item.selected && styles.dim]}>
            <TouchableOpacity onPress={() => update(index, { selected: !item.selected })} style={styles.check}>
              <Icon
                name={item.selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={iconSize.md}
                color={item.selected ? colors.green : colors.textMuted}
              />
            </TouchableOpacity>
            <View style={styles.rowInfo}>
              <Text style={[styles.desc, { color: colors.text }]} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {parseIsoDate(item.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                {item.type === 'INCOME' ? ' · abono' : ''}
                {item.duplicate ? ' · posible duplicado' : ''}
              </Text>
              {item.type === 'EXPENSE' && (
                <TouchableOpacity
                  onPress={() => setEditing(index)}
                  style={[styles.chip, { borderColor: colors.green, backgroundColor: colors.greenLight }]}
                >
                  <Text style={[styles.chipText, { color: colors.green }]}>{item.category}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.amount, { color: item.type === 'INCOME' ? colors.green : colors.text }]}>
              {item.type === 'INCOME' ? '+' : ''}
              {money(item.amount)}
            </Text>
          </View>
        )}
      />
      <Button
        title={`Guardar ${selected.length} (${money(total)})`}
        onPress={save}
        loading={saving}
        disabled={!selected.length}
      />

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]} onPress={() => setEditing(null)}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <ScrollView contentContainerStyle={styles.options}>
              {options.map(name => (
                <TouchableOpacity
                  key={name}
                  onPress={() => editing !== null && setCategory(editing, name)}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  help: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  dim: { opacity: 0.5 },
  check: { paddingRight: 10 },
  rowInfo: { flex: 1 },
  desc: { fontSize: 15, fontWeight: '500' },
  sub: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  chipText: { fontSize: 12 },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, padding: 16, maxHeight: '70%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
