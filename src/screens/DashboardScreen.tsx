import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import { objectivesApi } from '../services/objectives';
import { iconSize } from '../theme/tokens';
import SummaryCard from '../components/SummaryCard';
import ForecastWidget from '../components/ForecastWidget';
import DebtCard from '../components/DebtCard';
import DebtPaymentHistoryModal from '../components/DebtPaymentHistoryModal';
import StatementDayPicker from '../components/StatementDayPicker';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import { useQuickAdd } from '../components/QuickAdd';
import { pendingCount } from '../services/transactionQueue';
import CategoryBreakdown from '../components/CategoryBreakdown';
import { byCategory, inMonth, monthKey, monthLabel, shiftMonth } from '../utils/months';
import GoalWidget, { EmptyGoalWidget, type GoalWidgetData } from '../widget/GoalWidget';
import type { Transaction, FinancialObjective, Forecast, MonthlySpendingEntry } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const quickAdd = useQuickAdd();
  const { data: pending } = useQuery({ queryKey: ['pending'], queryFn: pendingCount });
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [debtModalVisible, setDebtModalVisible] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtStatementDay, setDebtStatementDay] = useState(1);
  const [historyDebtId, setHistoryDebtId] = useState<string | null>(null);
  const [historyDebtName, setHistoryDebtName] = useState('');
  const { data: transactions, isLoading: txLoading, isError: txError, refetch: txRefetch } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    },
  });

  const { data: goals, isLoading: goalsLoading, isError: goalsError, refetch: goalsRefetch } = useQuery<FinancialObjective[]>({
    queryKey: ['goals'],
    queryFn: () => objectivesApi.list('SAVING_GOAL'),
  });

  const mainGoal = goals?.[0];

  const { data: forecast, isLoading: forecastLoading } = useQuery<Forecast | null>({
    queryKey: ['forecast', mainGoal?.id],
    queryFn: () => (mainGoal ? objectivesApi.getForecast(mainGoal.id) : null),
    enabled: !!mainGoal,
  });

  const { data: debts, refetch: debtsRefetch } = useQuery<FinancialObjective[]>({
    queryKey: ['debts'],
    queryFn: () => objectivesApi.list('DEBT_PAYOFF'),
  });

  const { data: monthlySpendingData } = useQuery<MonthlySpendingEntry[]>({
    queryKey: ['monthly-spending'],
    queryFn: () => objectivesApi.getMonthlySpending(),
  });

  const createDebtMutation = useMutation({
    mutationFn: () =>
      objectivesApi.create({
        type: 'DEBT_PAYOFF',
        name: debtName,
        targetAmount: parseFloat(debtTotal),
        dueDate: debtDueDate || undefined,
        statementDay: debtStatementDay,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-spending'] });
      setDebtModalVisible(false);
      setDebtName('');
      setDebtTotal('');
      setDebtDueDate('');
      setDebtStatementDay(1);
      showToast('Deuda creada');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo crear la deuda');
    },
  });

  useEffect(() => {
    if (mainGoal && forecast) {
      const widgetData: GoalWidgetData = {
        goalName: mainGoal.name,
        estimatedDays: forecast.estimatedDays,
        estimatedDate: new Date(forecast.estimatedDate).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
        }),
      };
      AsyncStorage.setItem('GoalWidget:data', JSON.stringify(widgetData));
      requestWidgetUpdate({
        widgetName: 'GoalWidget',
        renderWidget: () => <GoalWidget data={widgetData} />,
      });
    } else if (goals && goals.length === 0) {
      AsyncStorage.removeItem('GoalWidget:data');
      requestWidgetUpdate({
        widgetName: 'GoalWidget',
        renderWidget: () => <EmptyGoalWidget />,
      });
    }
  }, [mainGoal, forecast, goals]);

  // Totales del mes elegido (antes eran de todo el historial).
  const monthTx = inMonth(transactions ?? [], month);
  const totalIncome = monthTx.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = monthTx.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);
  const isCurrentMonth = month === monthKey(new Date());
  const isEmpty = (transactions?.length ?? 0) === 0;
  const netSaving = totalIncome - totalExpense;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([txRefetch(), goalsRefetch(), debtsRefetch()]);
    setRefreshing(false);
  }, [txRefetch, goalsRefetch, debtsRefetch]);

  if (txLoading || goalsLoading) {
    return <LoadingScreen />;
  }

  if (txError || goalsError) {
    return (
      <ErrorMessage
        message="No se pudieron cargar los datos del dashboard."
        onRetry={() => {
          txRefetch();
          goalsRefetch();
        }}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
      <TouchableOpacity
        style={[styles.quickAddBtn, { backgroundColor: colors.green }]}
        onPress={() => quickAdd.open()}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={iconSize.md} color="#FFFFFF" />
        <Text style={styles.quickAddText}>Registrar gasto</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ImportStatement')}>
        <Text style={[styles.importLink, { color: colors.green }]}>
          <Icon name="file-document-outline" size={iconSize.sm} color={colors.green} /> Importar estado de cuenta (PDF)
        </Text>
      </TouchableOpacity>
      {!!pending && (
        <Text style={[styles.pending, { color: colors.textSecondary }]}>
          <Icon name="cloud-upload-outline" size={iconSize.sm} color={colors.textSecondary} /> {pending}{' '}
          {pending === 1 ? 'movimiento pendiente' : 'movimientos pendientes'} de enviar
        </Text>
      )}

      {isEmpty && (
        <>
          <Text style={[styles.header, { color: colors.text }]}>Para empezar</Text>
          <TouchableOpacity
            style={[styles.startCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ImportStatement')}
          >
            <Icon name="file-document-outline" size={iconSize.lg} color={colors.green} />
            <View style={styles.startText}>
              <Text style={[styles.startTitle, { color: colors.text }]}>Importa tu estado de cuenta</Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Sube el PDF del banco y carga todos los gastos del mes de una vez.
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.startCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Recurring')}
          >
            <Icon name="cash-plus" size={iconSize.lg} color={colors.green} />
            <View style={styles.startText}>
              <Text style={[styles.startTitle, { color: colors.text }]}>Agrega tu sueldo como ingreso fijo</Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Se registra solo cada semana o quincena, y puedes cargar los pagos anteriores.
              </Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {!isEmpty && (
        <>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthBtn} accessibilityLabel="Mes anterior">
              <Icon name="chevron-left" size={iconSize.md} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.header, styles.monthTitle, { color: colors.text }]}>{monthLabel(month)}</Text>
            <TouchableOpacity
              onPress={() => setMonth(shiftMonth(month, 1))}
              style={styles.monthBtn}
              disabled={isCurrentMonth}
              accessibilityLabel="Mes siguiente"
            >
              <Icon name="chevron-right" size={iconSize.md} color={isCurrentMonth ? colors.textMuted : colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <SummaryCard title="Ingresos" amount={totalIncome} color={colors.green} icon="trending-up" compact />
            <SummaryCard title="Gastos" amount={totalExpense} color={colors.red} icon="trending-down" compact />
          </View>
          <View style={styles.row}>
            <SummaryCard title="Balance del mes" amount={netSaving} color={netSaving >= 0 ? colors.green : colors.red} icon="piggy-bank" compact />
          </View>

          <Text style={[styles.header, styles.sectionGap, { color: colors.text }]}>¿En qué se me va?</Text>
          {totalExpense > 0 ? (
            <CategoryBreakdown items={byCategory(monthTx)} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Sin gastos este mes.</Text>
          )}
        </>
      )}

      {mainGoal && (
        <>
          {forecastLoading ? (
            <View style={styles.forecastLoader}>
              <ActivityIndicator size="small" color={colors.green} />
            </View>
          ) : forecast ? (
            <ForecastWidget forecast={forecast} goal={mainGoal} compact />
          ) : null}
        </>
      )}

      {!mainGoal && (
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Metas' })}>
          <Text style={[styles.inlineLink, { color: colors.green }]}>
            <Icon name="target" size={iconSize.sm} color={colors.green} /> Crear una meta de ahorro ›
          </Text>
        </TouchableOpacity>
      )}

      {/* Debts Section */}
      {!!debts?.length && (
        <Text style={[styles.header, styles.debtsHeader, { color: colors.text }]}>Deudas</Text>
      )}
      {debts && debts.length > 0 ? (
        debts.map(debt => {
          const spending = monthlySpendingData?.find(s => s.debtId === debt.id);
          return (
            <TouchableOpacity
              key={debt.id}
              onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
            >
              <DebtCard
                debt={debt}
                compact
                monthlySpending={spending?.monthlySpending}
                periodStart={spending?.periodStart}
                periodEnd={spending?.periodEnd}
                onHistory={() => {
                  setHistoryDebtId(debt.id);
                  setHistoryDebtName(debt.name);
                }}
              />
            </TouchableOpacity>
          );
        })
      ) : null}

      <TouchableOpacity
        style={[styles.addDebtBtn, { borderColor: colors.green }]}
        onPress={() => setDebtModalVisible(true)}
      >
        <Text style={[styles.addDebtBtnText, { color: colors.green }]}>+ Agregar deuda</Text>
      </TouchableOpacity>

      {/* Create Debt Modal */}
      <Modal visible={debtModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.bgModalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva deuda</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Ej: Tarjeta de crédito"
              placeholderTextColor={colors.textMuted}
              value={debtName}
              onChangeText={setDebtName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Monto total</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Ej: 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={debtTotal}
              onChangeText={setDebtTotal}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha de vencimiento (opcional)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={debtDueDate}
              onChangeText={setDebtDueDate}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Día de corte (si aplica)</Text>
            <View style={styles.statementPickerWrap}>
              <StatementDayPicker value={debtStatementDay} onChange={setDebtStatementDay} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.bgCard }]}
                onPress={() => {
                  setDebtModalVisible(false);
                  setDebtName('');
                  setDebtTotal('');
                  setDebtDueDate('');
                  setDebtStatementDay(1);
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.green }]}
                onPress={() => {
                  if (!debtName.trim() || !debtTotal.trim()) {
                    Alert.alert('Error', 'Nombre y monto son obligatorios');
                    return;
                  }
                  createDebtMutation.mutate();
                }}
                disabled={createDebtMutation.isPending}
              >
                <Text style={styles.modalBtnTextPrimary}>
                  {createDebtMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DebtPaymentHistoryModal
        visible={!!historyDebtId}
        debtId={historyDebtId || ''}
        debtName={historyDebtName}
        onClose={() => {
          setHistoryDebtId(null);
          setHistoryDebtName('');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  quickAddText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  importLink: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  pending: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthBtn: {
    padding: 6,
  },
  monthTitle: {
    marginBottom: 0,
  },
  sectionGap: {
    marginTop: 16,
  },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  startText: {
    flex: 1,
  },
  startTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  inlineLink: {
    fontSize: 14,
    marginTop: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyEmoji: {
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  forecastLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  addDebtBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  addDebtBtnText: {
    fontSize: 14,
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
  statementPickerWrap: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  debtsHeader: {
    marginTop: 12,
  },
  modalBtnTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
