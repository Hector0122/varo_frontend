import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Button, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { api } from '../services/api';
import ForecastWidget from '../components/ForecastWidget';
import TrendBadge from '../components/TrendBadge';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Goal, Forecast } from '../types';

type GoalDetailRouteProp = RouteProp<RootStackParamList, 'GoalDetail'>;

export default function GoalDetailScreen() {
  const route = useRoute<GoalDetailRouteProp>();
  const { goalId } = route.params;
  const queryClient = useQueryClient();

  const { data: goal, isLoading: goalLoading } = useQuery<Goal>({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const res = await api.get('/goals');
      return res.data.find((g: Goal) => g.id === goalId);
    },
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery<Forecast>({
    queryKey: ['forecast', goalId],
    queryFn: async () => {
      const res = await api.get(`/forecast/${goalId}`);
      return res.data;
    },
    enabled: !!goalId,
  });

  const [addAmount, setAddAmount] = useState('');

  const updateMutation = useMutation({
    mutationFn: async (currentAmount: number) => {
      const res = await api.patch(`/goals/${goalId}`, { currentAmount });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['forecast', goalId] });
      setAddAmount('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar');
    },
  });

  const handleAddAmount = () => {
    const val = Number(addAmount);
    if (!val || val <= 0) return;
    const newAmount = (goal?.currentAmount ?? 0) + val;
    updateMutation.mutate(newAmount);
  };

  if (goalLoading || !goal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{goal.name}</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <Text style={styles.amounts}>
        ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
      </Text>

      {forecastLoading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} />
      ) : forecast ? (
        <>
          <ForecastWidget forecast={forecast} />
          <View style={styles.trendRow}>
            <Text style={styles.label}>Tendencia:</Text>
            <TrendBadge trend={forecast.trend} />
          </View>
          <Text style={styles.label}>Confianza: {Math.round(forecast.confidenceScore * 100)}%</Text>
        </>
      ) : null}

      <View style={styles.addSection}>
        <Text style={styles.addTitle}>Agregar ahorro</Text>
        <TextInput
          style={styles.input}
          placeholder="Monto"
          keyboardType="decimal-pad"
          value={addAmount}
          onChangeText={setAddAmount}
        />
        <Button title="Agregar" onPress={handleAddAmount} disabled={updateMutation.isPending} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginRight: 12,
  },
  progressBarFill: {
    height: 12,
    backgroundColor: '#2e7d32',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  amounts: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  addSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
});
