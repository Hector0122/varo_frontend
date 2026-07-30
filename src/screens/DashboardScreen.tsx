import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { objectivesApi } from '../services/objectives';
import SummaryCard from '../components/SummaryCard';
import ForecastWidget from '../components/ForecastWidget';
import DebtCard from '../components/DebtCard';
import DebtPaymentHistoryModal from '../components/DebtPaymentHistoryModal';
import StatementDayPicker from '../components/StatementDayPicker';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import GoalWidget, { EmptyGoalWidget, type GoalWidgetData } from '../widget/GoalWidget';
import type { Transaction, FinancialObjective, Forecast, MonthlySpendingEntry } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
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

  const totalIncome = transactions?.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const totalExpense = transactions?.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
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
      <Text style={[styles.header, { color: colors.text }]}>Resumen</Text>
      <View style={styles.row}>
        <SummaryCard title="Ingresos" amount={totalIncome} color={colors.green} icon="📈" compact />
        <SummaryCard title="Gastos" amount={totalExpense} color={colors.red} icon="📉" compact />
      </View>
      <View style={styles.row}>
        <SummaryCard title="Ahorro neto" amount={netSaving} color={netSaving >= 0 ? colors.green : colors.red} icon="💰" compact />
      </View>

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
        <View style={[styles.emptyCard, { backgroundColor: colors.bgCard }]}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sin metas activas</Text>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Crea tu primera meta para ver el forecast.</Text>
        </View>
      )}

      {/* Debts Section */}
      <Text style={[styles.header, styles.debtsHeader, { color: colors.text }]}>Deudas</Text>
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
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.bgCard }]}>
          <Text style={styles.emptyEmoji}>💳</Text>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sin deudas</Text>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Agrega una deuda para darle seguimiento.</Text>
        </View>
      )}

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
    fontSize: 24,
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
