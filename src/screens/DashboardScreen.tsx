import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import ForecastWidget from '../components/ForecastWidget';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import GoalWidget, { type GoalWidgetData } from '../widget/GoalWidget';
import type { Transaction, Goal, Forecast } from '../types';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
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
    }
  }, [mainGoal, forecast]);

  const totalIncome = transactions?.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const totalExpense = transactions?.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const netSaving = totalIncome - totalExpense;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([txRefetch(), goalsRefetch()]);
    setRefreshing(false);
  }, [txRefetch, goalsRefetch]);

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
});
