import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { api } from '../services/api';
import ForecastWidget from '../components/ForecastWidget';
import TrendBadge from '../components/TrendBadge';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Goal, Forecast } from '../types';

type GoalDetailRouteProp = RouteProp<RootStackParamList, 'GoalDetail'>;

export default function GoalDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<GoalDetailRouteProp>();
  const { goalId } = route.params;
  const queryClient = useQueryClient();

  const { data: goal, isLoading: goalLoading } = useQuery<Goal>({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const res = await api.get(`/goals/${goalId}`);
      return res.data;
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
  const [allocInput, setAllocInput] = useState('');
  const [editingAlloc, setEditingAlloc] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post(`/goals/${goalId}/add-savings`, { amount });
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

  const allocMutation = useMutation({
    mutationFn: async (savingAllocation: number) => {
      const res = await api.patch(`/goals/${goalId}`, { savingAllocation });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['forecast', goalId] });
      setEditingAlloc(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar');
    },
  });

  const handleAddAmount = () => {
    const val = Number(addAmount);
    if (!val || val <= 0) return;
    updateMutation.mutate(val);
  };

  const handleSaveAlloc = () => {
    const val = Number(allocInput);
    if (val < 0 || val > 100) {
      Alert.alert('Error', 'El porcentaje debe estar entre 0 y 100');
      return;
    }
    allocMutation.mutate(val);
  };

  if (goalLoading || !goal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const progress = Number(goal.targetAmount) > 0 ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{goal.name}</Text>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.progressBg }]}>
          <View style={[styles.progressBarFill, { backgroundColor: colors.green, width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.green }]}>{Math.round(progress)}%</Text>
      </View>

      <Text style={[styles.amounts, { color: colors.textSecondary }]}>
        ${Number(goal.currentAmount).toLocaleString()} / ${Number(goal.targetAmount).toLocaleString()}
      </Text>

      <View style={styles.allocRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Asignación de ahorro:</Text>
        {editingAlloc ? (
          <View style={styles.allocEditRow}>
            <TextInput
              style={[styles.allocInput, { borderColor: colors.border, color: colors.text }]}
              value={allocInput}
              onChangeText={setAllocInput}
              keyboardType="numeric"
              placeholder={String(goal.savingAllocation)}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>%</Text>
            <Button title="Guardar" onPress={handleSaveAlloc} />
            <Button title="Cancelar" onPress={() => setEditingAlloc(false)} color={colors.textTertiary} />
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setAllocInput(String(goal.savingAllocation)); setEditingAlloc(true); }}>
            <Text style={[styles.allocValue, { color: colors.green }]}>{goal.savingAllocation}%</Text>
          </TouchableOpacity>
        )}
      </View>

      {forecastLoading ? (
        <ActivityIndicator style={styles.forecastLoader} />
      ) : forecast ? (
        <>
          <ForecastWidget forecast={forecast} goal={goal} />
          <View style={styles.trendRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tendencia:</Text>
            <TrendBadge trend={forecast.trend} />
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Confianza: {Math.round(forecast.confidenceScore * 100)}%</Text>
        </>
      ) : null}

      <View style={[styles.addSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.addTitle, { color: colors.text }]}>Agregar ahorro</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholderTextColor={colors.textMuted}
          placeholder="Monto a agregar"
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
    borderRadius: 6,
    marginRight: 12,
  },
  progressBarFill: {
    height: 12,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amounts: {
    fontSize: 16,
    marginBottom: 16,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  allocEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    width: 60,
    textAlign: 'center',
  },
  allocValue: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    marginRight: 8,
  },
  forecastLoader: {
    marginVertical: 16,
  },
  addSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  addTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
});
