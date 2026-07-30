import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { isLinkedCategory } from '../constants/systemCategories';
import type { Transaction } from '../types';

interface Props {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: Props) {
  const { colors } = useTheme();
  const isIncome = transaction.type === 'INCOME';
  const color = isIncome ? colors.green : colors.red;
  const sign = isIncome ? '+' : '-';
  const linked = isLinkedCategory(transaction.category);

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
      <View style={styles.info}>
        <View style={styles.categoryRow}>
          <Text style={[styles.category, { color: colors.text }]}>{transaction.category}</Text>
          {linked && (
            <View style={[styles.linkedBadge, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.linkedBadgeText, { color: colors.textSecondary }]}>🔗 auto</Text>
            </View>
          )}
        </View>
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
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  info: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  linkedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
