import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import DebtPaymentHistoryModal from '../components/DebtPaymentHistoryModal';
import type { Debt } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type DebtDetailRouteProp = RouteProp<RootStackParamList, 'DebtDetail'>;

export default function DebtDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<DebtDetailRouteProp>();
  const { debtId } = route.params;
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [actionMode, setActionMode] = useState<'pay' | 'add'>('pay');
  const [note, setNote] = useState('');
  const [installments, setInstallments] = useState('1');
  const [historyVisible, setHistoryVisible] = useState(false);

  const { data: debt, isLoading, isError, refetch } = useQuery<Debt>({
    queryKey: ['debt', debtId],
    queryFn: async () => {
      const res = await api.get(`/debts/${debtId}`);
      return res.data;
    },
  });

  const payMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await api.post(`/debts/${debtId}/pay`, { amount, ...(note && { note }) });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setAmount('');
      setNote('');
      showToast('Pago registrado');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo registrar el pago');
    },
  });

  const addMutation = useMutation({
    mutationFn: async (amount: number) => {
      const inst = parseInt(installments, 10) || 1;
      const res = await api.post(`/debts/${debtId}/add`, { amount, ...(note && { note }), installments: inst });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setAmount('');
      setNote('');
      setInstallments('1');
      showToast('Monto agregado a la deuda');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo agregar el monto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/debts/${debtId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      showToast('Deuda eliminada');
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo eliminar');
    },
  });

  const confirmDelete = () => {
    Alert.alert('Eliminar deuda', '¿Estás seguro? Se borrará todo el historial.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorMessage message="No se pudo cargar la deuda." onRetry={refetch} />;
  if (!debt) return null;

  const paid = Number(debt.totalAmount) - Number(debt.currentAmount);
  const progress = Number(debt.totalAmount) > 0 ? (paid / Number(debt.totalAmount)) * 100 : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.name, { color: colors.text }]}>{debt.name}</Text>

        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.label, { color: colors.textTertiary }]}>Restante</Text>
            <Text style={[styles.remaining, { color: colors.red }]}>
              ${Number(debt.currentAmount).toLocaleString()}
            </Text>
          </View>
          <View style={styles.totalCol}>
            <Text style={[styles.label, { color: colors.textTertiary }]}>Total</Text>
            <Text style={[styles.total, { color: colors.text }]}>
              ${Number(debt.totalAmount).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.progressBg, { backgroundColor: colors.progressBg }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.red, width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={[styles.percent, { color: colors.red }]}>{Math.round(progress)}% pagado</Text>

        {debt.dueDate && (
          <Text style={[styles.due, { color: colors.textMuted }]}>
            Vence: {new Date(debt.dueDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Unified movement */}
      <View style={[styles.actionCard, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.actionTitle, { color: colors.text }]}>Movimiento</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              { borderColor: colors.border, backgroundColor: colors.bgSecondary },
              actionMode === 'pay' && { backgroundColor: colors.green, borderColor: colors.green },
            ]}
            onPress={() => setActionMode('pay')}
          >
            <Text style={[
              styles.modeBtnText,
              { color: colors.text },
              actionMode === 'pay' && { color: colors.bg },
            ]}>Pagar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              { borderColor: colors.border, backgroundColor: colors.bgSecondary },
              actionMode === 'add' && { backgroundColor: colors.red, borderColor: colors.red },
            ]}
            onPress={() => setActionMode('add')}
          >
            <Text style={[
              styles.modeBtnText,
              { color: colors.text },
              actionMode === 'add' && styles.textWhite,
            ]}>Aumentar</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
          placeholder="Monto"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
          placeholder="Nota (opcional)"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
        />
        {actionMode === 'add' && (
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Meses (1 = contado)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={installments}
            onChangeText={setInstallments}
          />
        )}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: actionMode === 'pay' ? colors.green : colors.red },
          ]}
          onPress={() => {
            const val = parseFloat(amount);
            if (!val || val <= 0) return Alert.alert('Error', 'Ingresa un monto válido');
            if (actionMode === 'pay') {
              if (val > Number(debt.currentAmount)) return Alert.alert('Error', 'El pago no puede ser mayor al saldo pendiente');
              payMutation.mutate(val);
            } else {
              addMutation.mutate(val);
            }
          }}
          disabled={payMutation.isPending || addMutation.isPending}
        >
          <Text style={styles.actionBtnText}>
            {payMutation.isPending || addMutation.isPending
              ? 'Guardando...'
              : actionMode === 'pay'
              ? 'Pagar'
              : 'Aumentar deuda'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <TouchableOpacity
        style={[styles.historyBtn, { borderColor: colors.border }]}
        onPress={() => setHistoryVisible(true)}
      >
        <Text style={[styles.historyBtnText, { color: colors.green }]}>
          📋 Ver historial de pagos
        </Text>
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Eliminar deuda</Text>
      </TouchableOpacity>

      <DebtPaymentHistoryModal
        visible={historyVisible}
        debtId={debtId}
        debtName={debt.name}
        onClose={() => setHistoryVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
  },
  remaining: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  totalCol: {
    alignItems: 'flex-end',
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },
  percent: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  due: {
    fontSize: 13,
    marginTop: 4,
  },
  actionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
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
  historyBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  historyBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteText: {
    fontSize: 14,
    color: '#999',
  },
});
