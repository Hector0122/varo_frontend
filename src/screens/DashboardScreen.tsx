import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import GoalCard from '../components/GoalCard';
import ForecastWidget from '../components/ForecastWidget';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import type { Transaction, Goal, Forecast } from '../types';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { data: transactions, isLoading: txLoading, isError: txError, refetch: txRefetch } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    },
  });

  const { data: goals, isLoading: goalsLoading, isError: goalsError, refetch: goalsRefetch } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await api.get('/goals');
      return res.data;
    },
  });

  const mainGoal = goals?.[0];

  const { data: forecast, isLoading: forecastLoading } = useQuery<Forecast>({
    queryKey: ['forecast', mainGoal?.id],
    queryFn: async () => {
      if (!mainGoal) return null;
      const res = await api.get(`/forecast/${mainGoal.id}`);
      return res.data;
    },
    enabled: !!mainGoal,
  });

  const totalIncome = transactions?.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const totalExpense = transactions?.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const netSaving = totalIncome - totalExpense;

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
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.header, { color: colors.text }]}>Resumen</Text>
      <View style={styles.row}>
        <SummaryCard title="Ingresos" amount={totalIncome} color={colors.green} />
        <SummaryCard title="Gastos" amount={totalExpense} color={colors.red} />
      </View>
      <View style={styles.row}>
        <SummaryCard title="Ahorro neto" amount={netSaving} color={netSaving >= 0 ? colors.green : colors.red} />
      </View>

      {mainGoal && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Meta principal</Text>
          <GoalCard goal={mainGoal} />
          {forecastLoading ? (
            <LoadingScreen />
          ) : forecast ? (
            <ForecastWidget forecast={forecast} goal={mainGoal} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
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
});
