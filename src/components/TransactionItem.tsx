import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Transaction } from '../types';

interface Props {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: Props) {
  const { colors } = useTheme();
  const isIncome = transaction.type === 'INCOME';
  const color = isIncome ? colors.green : colors.red;
  const sign = isIncome ? '+' : '-';

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
      <View style={styles.info}>
        <Text style={[styles.category, { color: colors.text }]}>{transaction.category}</Text>
        <Text style={[styles.note, { color: colors.textTertiary }]}>{transaction.note || ''}</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{new Date(transaction.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>
        {sign}${Number(transaction.amount).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 15,
    fontWeight: '500',
  },
  note: {
    fontSize: 13,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
  },
});
