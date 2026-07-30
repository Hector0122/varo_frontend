import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api';
import LoadingScreen from './LoadingScreen';
import type { DebtPayment } from '../types';

interface Props {
  visible: boolean;
  debtId: string;
  debtName: string;
  onClose: () => void;
}

export default function DebtPaymentHistoryModal({ visible, debtId, debtName, onClose }: Props) {
  const { colors } = useTheme();
  const { data: payments, isLoading } = useQuery<DebtPayment[]>({
    queryKey: ['debt-payments', debtId],
    queryFn: async () => {
      const res = await api.get(`/debts/${debtId}/payments`);
      return res.data;
    },
    enabled: visible,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]}>
        <View style={[styles.content, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Historial - {debtName}
          </Text>

          {isLoading ? (
            <LoadingScreen />
          ) : payments && payments.length > 0 ? (
            <FlatList
              data={payments}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                  <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
                    <View style={styles.rowLeft}>
                      <Text style={[styles.rowType, { color: colors.text }]}>
                        {item.type === 'PAYMENT' ? '💰 Pago' : '📈 Aumento'}
                      </Text>
                      <Text style={[styles.rowDate, { color: colors.textMuted }]}>
                        {new Date(item.purchaseDate ?? item.createdAt).toLocaleDateString()}
                      </Text>
                      {item.note && (
                        <Text style={[styles.rowNote, { color: colors.textTertiary }]} numberOfLines={2}>
                          {item.note}
                        </Text>
                      )}
                      {item.type === 'INCREASE' && item.installments && item.installments > 1 && (
                        <Text style={[styles.rowNote, { color: colors.textTertiary }]}>
                          {item.installments} meses de ${(Number(item.amount) / item.installments).toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      styles.rowAmount,
                      { color: item.type === 'PAYMENT' ? colors.green : colors.red },
                    ]}>
                      {item.type === 'PAYMENT' ? '-' : '+'}${Number(item.amount).toLocaleString()}
                    </Text>
                  </View>
              )}
            />
          ) : (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>
              Sin movimientos registrados.
            </Text>
          )}

          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.green }]} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flex: 1,
  },
  rowType: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowDate: {
    fontSize: 12,
    marginTop: 2,
  },
  rowNote: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 32,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
