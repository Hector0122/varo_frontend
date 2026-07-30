import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { api } from '../services/api';
import ForecastWidget from '../components/ForecastWidget';
import TrendBadge from '../components/TrendBadge';
import LoadingScreen from '../components/LoadingScreen';
import GoalContributionHistoryModal from '../components/GoalContributionHistoryModal';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Goal, Forecast } from '../types';

type GoalDetailRouteProp = RouteProp<RootStackParamList, 'GoalDetail'>;

export default function GoalDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<GoalDetailRouteProp>();
  const { goalId } = route.params;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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

  const [savingMode, setSavingMode] = useState<'add' | 'withdraw'>('add');
  const [savingAmount, setSavingAmount] = useState('');
  const [allocInput, setAllocInput] = useState('');
  const [editingAlloc, setEditingAlloc] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post(`/goals/${goalId}/add-savings`, { amount });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['forecast', goalId] });
      setSavingAmount('');
      showToast('Ahorro agregado');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post(`/goals/${goalId}/withdraw-savings`, { amount });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['forecast', goalId] });
      setSavingAmount('');
      showToast('Ahorro retirado');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo retirar');
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
      showToast('Asignación actualizada');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar');
    },
  });

  const handleSavingAction = () => {
    const val = Number(savingAmount);
    if (!val || val <= 0) return;
    if (savingMode === 'add') {
      updateMutation.mutate(val);
    } else {
      if (goal && val > Number(goal.currentAmount)) {
        Alert.alert('Error', 'No puedes retirar más de lo que hay ahorrado');
        return;
      }
      withdrawMutation.mutate(val);
    }
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
    return <LoadingScreen />;
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
            <TouchableOpacity style={[styles.allocSmallBtn, { backgroundColor: colors.green }]} onPress={handleSaveAlloc}>
              <Text style={styles.allocSmallBtnText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.allocSmallBtn, { backgroundColor: colors.textTertiary }]} onPress={() => setEditingAlloc(false)}>
              <Text style={styles.allocSmallBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setAllocInput(String(goal.savingAllocation)); setEditingAlloc(true); }}>
            <Text style={[styles.allocValue, { color: colors.green }]}>{goal.savingAllocation}%</Text>
          </TouchableOpacity>
        )}
      </View>

      {forecastLoading ? (
        <View style={styles.forecastLoader}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
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
        <Text style={[styles.addTitle, { color: colors.text }]}>Ahorro</Text>
        <Text style={[styles.autoLogHint, { color: colors.textTertiary }]}>
          {savingMode === 'add'
            ? '🔗 Agregar ahorro se registra automáticamente como gasto — no necesitas agregarlo también en Movimientos.'
            : '🔗 Retirar ahorro se registra automáticamente como ingreso.'}
        </Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              { borderColor: colors.border, backgroundColor: colors.bgSecondary },
              savingMode === 'add' && { backgroundColor: colors.green, borderColor: colors.green },
            ]}
            onPress={() => setSavingMode('add')}
          >
            <Text style={[
              styles.modeBtnText,
              { color: colors.text },
              savingMode === 'add' && { color: colors.bg },
            ]}>Agregar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              { borderColor: colors.border, backgroundColor: colors.bgSecondary },
              savingMode === 'withdraw' && { backgroundColor: colors.red, borderColor: colors.red },
            ]}
            onPress={() => setSavingMode('withdraw')}
          >
            <Text style={[
              styles.modeBtnText,
              { color: colors.text },
              savingMode === 'withdraw' && styles.textWhite,
            ]}>Retirar</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholderTextColor={colors.textMuted}
          placeholder="Monto"
          keyboardType="decimal-pad"
          value={savingAmount}
          onChangeText={setSavingAmount}
        />
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: savingMode === 'add' ? colors.green : colors.red },
          ]}
          onPress={handleSavingAction}
          disabled={updateMutation.isPending || withdrawMutation.isPending}
        >
          <Text style={styles.actionBtnText}>
            {updateMutation.isPending || withdrawMutation.isPending
              ? 'Guardando...'
              : savingMode === 'add'
              ? 'Agregar ahorro'
              : 'Retirar ahorro'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.historyBtn, { borderColor: colors.border }]}
          onPress={() => setHistoryVisible(true)}
        >
          <Text style={[styles.historyBtnText, { color: colors.green }]}>
            📋 Ver historial de ahorro
          </Text>
        </TouchableOpacity>
      </View>

      <GoalContributionHistoryModal
        visible={historyVisible}
        goalId={goalId}
        goalName={goal.name}
        onClose={() => setHistoryVisible(false)}
      />
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textWhite: {
    color: '#fff',
  },
  autoLogHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  historyBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  historyBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  allocSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  allocSmallBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
