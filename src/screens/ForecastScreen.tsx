import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import { objectivesApi } from '../services/objectives';
import { useTheme } from '../theme/ThemeContext';
import { iconSize } from '../theme/tokens';
import Button from '../components/Button';
import { isLinkedCategory } from '../constants/systemCategories';
import { buildForecast, weeklyCashSpending, type ForecastRecurring } from '../utils/forecast';
import { parseIsoDate, todayIso, toIsoDate } from '../utils/dates';
import { money } from '../utils/money';
import type { FinancialObjective, MonthlySpendingEntry, Transaction } from '../types';

const WEEKS = 13; // 3 meses
const DEFAULT_VARIABLE = 300; // pasajes en efectivo, mientras no haya historial

const short = (iso: string) => parseIsoDate(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const num = (s: string) => Number(s.replace(/[$,\s]/g, ''));
const dueDayOf = (c: FinancialObjective) => (c.dueDate ? Number(c.dueDate.slice(8, 10)) : 0);

type Editing =
  | { kind: 'balance' }
  | { kind: 'setup' }
  | { kind: 'card'; card: FinancialObjective };

/**
 * Proyección a 3 meses del saldo de tu cuenta principal (p. ej. Mercado Pago):
 * sueldos y fijos en su fecha, pagos de tarjeta en su vencimiento, gasto
 * variable promedio y rendimiento. "Actualizar saldo" la recalcula desde lo real.
 */
export default function ForecastScreen() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState({ a: '', b: '', c: '' });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => objectivesApi.list('SAVING_GOAL') });
  const cards = useQuery({ queryKey: ['debts'], queryFn: () => objectivesApi.list('DEBT_PAYOFF') });
  const spending = useQuery<MonthlySpendingEntry[]>({
    queryKey: ['monthly-spending'],
    queryFn: () => objectivesApi.getMonthlySpending(),
  });
  const recurring = useQuery<(ForecastRecurring & { amount: number | string })[]>({
    queryKey: ['recurring'],
    queryFn: async () => (await api.get('/recurring-transactions')).data,
  });
  const transactions = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/transactions')).data,
  });

  const account = accounts.data?.[0];
  const today = todayIso();

  // Gasto variable: lo que pagaste sin tarjeta (no fijos ni transferencias) desde
  // que llevas la cuenta aquí, máximo las últimas 4 semanas.
  const variable = useMemo(() => {
    if (!account) return { weekly: DEFAULT_VARIABLE, estimated: true };
    const d = parseIsoDate(today);
    d.setDate(d.getDate() - 28);
    const since = [toIsoDate(d), account.createdAt.slice(0, 10)].sort()[1];
    const days = (parseIsoDate(today).getTime() - parseIsoDate(since).getTime()) / 86400000;
    if (days < 7) return { weekly: DEFAULT_VARIABLE, estimated: true };
    return { weekly: weeklyCashSpending(transactions.data ?? [], since, days, isLinkedCategory), estimated: false };
  }, [account, transactions.data, today]);

  const forecast = useMemo(() => {
    if (!account) return null;
    return buildForecast({
      balance: Number(account.currentAmount),
      balanceDate: (account.balanceDate ?? account.createdAt).slice(0, 10),
      today,
      ratePct: account.interestRate ?? 0,
      weeks: WEEKS,
      variableWeekly: variable.weekly,
      recurring: (recurring.data ?? []).map(r => ({ ...r, amount: Number(r.amount) })),
      cards: (cards.data ?? [])
        .filter(c => dueDayOf(c) > 0)
        .map(c => ({
          name: c.name,
          dueDay: dueDayOf(c),
          nextPayment: Number(c.nextPayment ?? 0),
          estimate: spending.data?.find(s => s.debtId === c.id)?.monthlySpending ?? 0,
        })),
    });
  }, [account, today, variable.weekly, recurring.data, cards.data, spending.data]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([accounts.refetch(), cards.refetch(), spending.refetch(), recurring.refetch(), transactions.refetch()]);
    setRefreshing(false);
  };

  const open = (e: Editing) => {
    if (e.kind === 'card') {
      setForm({ a: e.card.nextPayment ? String(Number(e.card.nextPayment)) : '', b: String(dueDayOf(e.card) || ''), c: '' });
    } else if (e.kind === 'setup') {
      setForm({ a: 'Mercado Pago', b: '', c: '12' });
    } else {
      setForm({ a: '', b: '', c: '' });
    }
    setEditing(e);
  };

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.kind === 'setup') {
        const balance = num(form.b);
        if (!form.a.trim() || Number.isNaN(balance)) throw new Error('Escribe el nombre y el saldo.');
        await objectivesApi.create({
          type: 'SAVING_GOAL',
          name: form.a.trim(),
          targetAmount: Math.max(balance, 1),
          currentAmount: balance,
          interestRate: num(form.c) || 0,
          balanceDate: today,
        });
      } else if (editing.kind === 'balance') {
        const balance = num(form.a);
        if (Number.isNaN(balance) || !form.a.trim()) throw new Error('Escribe el saldo que ves en tu app del banco.');
        await objectivesApi.update(account!.id, { currentAmount: balance, balanceDate: today });
      } else {
        const day = Math.round(num(form.b));
        if (!(day >= 1 && day <= 31)) throw new Error('El día de pago va del 1 al 31.');
        // dueDate guarda el próximo vencimiento; la proyección solo usa el día.
        const d = parseIsoDate(today);
        const due = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > day ? 1 : 0), day);
        await objectivesApi.update(editing.card.id, {
          nextPayment: num(form.a) || 0,
          dueDate: toIsoDate(due),
        });
      }
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      setEditing(null);
    } catch (err: any) {
      Alert.alert('Revisa los datos', err.response?.data?.message?.toString() || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (accounts.isLoading || cards.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const input = (value: string, onChange: (v: string) => void, placeholder: string, numeric = true) => (
    <TextInput
      style={[styles.input, { borderColor: colors.border, color: colors.text }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
    />
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />}
      >
        {!account || !forecast ? (
          <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.title, { color: colors.text }]}>Tu cuenta principal</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              La cuenta donde cae tu dinero y de donde pagas (por ejemplo Mercado Pago). Con su saldo de hoy, Varo
              proyecta los próximos 3 meses.
            </Text>
            <Button title="Configurar" onPress={() => open({ kind: 'setup' })} />
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>{account.name} hoy (estimado)</Text>
              <Text style={[styles.big, { color: forecast.todayBalance >= 0 ? colors.text : colors.red }]}>
                {money(Math.round(forecast.todayBalance * 100) / 100)}
              </Text>
              <TouchableOpacity onPress={() => open({ kind: 'balance' })}>
                <Text style={[styles.link, { color: colors.green }]}>
                  <Icon name="refresh" size={iconSize.sm} color={colors.green} /> Actualizar saldo · último{' '}
                  {short((account.balanceDate ?? account.createdAt).slice(0, 10))}
                </Text>
              </TouchableOpacity>
            </View>

            {forecast.min.balance < 0 && (
              <View style={[styles.alert, { borderColor: colors.red }]}>
                <Icon name="alert-outline" size={iconSize.md} color={colors.red} />
                <Text style={[styles.alertText, { color: colors.text }]}>
                  El {short(forecast.min.date)} tu saldo quedaría en {money(Math.round(forecast.min.balance))}.
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.stat, { backgroundColor: colors.bgCard }]}>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>En 3 meses</Text>
                <Text style={[styles.statValue, { color: forecast.endBalance >= 0 ? colors.green : colors.red }]}>
                  {money(Math.round(forecast.endBalance))}
                </Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.bgCard }]}>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>Te sobra por semana</Text>
                <Text style={[styles.statValue, { color: forecast.weeklyFree >= 0 ? colors.green : colors.red }]}>
                  {money(Math.round(forecast.weeklyFree))}
                </Text>
              </View>
            </View>
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Incluye gasto variable de {money(Math.round(variable.weekly))}/semana
              {variable.estimated ? ' (estimado inicial)' : ' (tu promedio en efectivo y débito)'} y rendimiento del{' '}
              {account.interestRate ?? 0}% anual.
            </Text>

            {!!cards.data?.length && (
              <>
                <Text style={[styles.section, { color: colors.text }]}>Tarjetas</Text>
                {cards.data.map(c => {
                  const est = spending.data?.find(s => s.debtId === c.id)?.monthlySpending ?? 0;
                  const next = Number(c.nextPayment ?? 0);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => open({ kind: 'card', card: c })}
                      style={[styles.card, styles.cardRow, { backgroundColor: colors.bgCard }]}
                    >
                      <View style={styles.fill}>
                        <Text style={[styles.cardName, { color: colors.text }]}>{c.name}</Text>
                        <Text style={[styles.muted, { color: colors.textSecondary }]}>
                          Debes {money(Number(c.currentAmount))}
                          {c.statementDay ? ` · corte día ${c.statementDay}` : ''}
                        </Text>
                      </View>
                      <View style={styles.right}>
                        {dueDayOf(c) ? (
                          <>
                            <Text style={[styles.cardName, { color: colors.text }]}>{money(next || est)}</Text>
                            <Text style={[styles.muted, { color: colors.textSecondary }]}>
                              {next ? 'capturado' : 'estimado'} · día {dueDayOf(c)}
                            </Text>
                          </>
                        ) : (
                          <Text style={[styles.link, { color: colors.green }]}>Poner día de pago</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <Text style={[styles.section, { color: colors.text }]}>Semana por semana</Text>
            {forecast.weeks.map(w => (
              <View key={w.start} style={[styles.week, { borderBottomColor: colors.border }]}>
                <View style={styles.weekHead}>
                  <Text style={[styles.weekTitle, { color: colors.textSecondary }]}>
                    {short(w.start)} – {short(w.end)}
                  </Text>
                  <Text style={[styles.weekTitle, { color: w.endBalance >= 0 ? colors.text : colors.red }]}>
                    {money(Math.round(w.endBalance))}
                  </Text>
                </View>
                {w.events.map((e, i) => (
                  <View key={i} style={styles.event}>
                    <Text style={[styles.eventText, { color: colors.textTertiary }]} numberOfLines={1}>
                      {short(e.date)} · {e.label}
                    </Text>
                    <Text style={[styles.eventText, { color: e.amount > 0 ? colors.green : colors.textSecondary }]}>
                      {e.amount > 0 ? '+' : '−'}
                      {money(Math.abs(e.amount))}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]} onPress={() => setEditing(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bg }]} onPress={() => {}}>
            {editing?.kind === 'setup' && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Tu cuenta principal</Text>
                {input(form.a, a => setForm({ ...form, a }), 'Nombre (ej. Mercado Pago)', false)}
                {input(form.b, b => setForm({ ...form, b }), 'Saldo de hoy')}
                {input(form.c, c => setForm({ ...form, c }), 'Rendimiento anual % (ej. 12)')}
              </>
            )}
            {editing?.kind === 'balance' && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Actualizar saldo</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  Pon lo que dice hoy tu app de {account?.name}. La proyección sigue desde ahí.
                </Text>
                {input(form.a, a => setForm({ ...form, a }), 'Saldo real de hoy')}
              </>
            )}
            {editing?.kind === 'card' && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{editing.card.name}</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  Próximo pago: el monto del estado de cuenta (para no generar intereses). Déjalo vacío para usar el
                  estimado con lo que llevas cargado en el periodo.
                </Text>
                {input(form.a, a => setForm({ ...form, a }), 'Próximo pago')}
                {input(form.b, b => setForm({ ...form, b }), 'Día de pago (1–31)')}
              </>
            )}
            <Button title="Guardar" onPress={submit} loading={saving} />
            <Button title="Cancelar" onPress={() => setEditing(null)} variant="ghost" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  title: { fontSize: 18, fontWeight: '700' },
  big: { fontSize: 34, fontWeight: '700' },
  muted: { fontSize: 13 },
  link: { fontSize: 13, marginTop: 4 },
  note: { fontSize: 12, marginBottom: 8 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  alertText: { flex: 1, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  stat: { flex: 1, borderRadius: 12, padding: 12, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  week: { borderBottomWidth: 1, paddingVertical: 8 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between' },
  weekTitle: { fontSize: 14, fontWeight: '700' },
  event: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  eventText: { fontSize: 13 },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, padding: 20, gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
});
