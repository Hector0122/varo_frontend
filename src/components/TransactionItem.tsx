import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Transaction } from '../types';

interface Props {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: Props) {
  const isIncome = transaction.type === 'INCOME';
  const color = isIncome ? '#2e7d32' : '#c62828';
  const sign = isIncome ? '+' : '-';

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.category}>{transaction.category}</Text>
        <Text style={styles.note}>{transaction.note || ''}</Text>
        <Text style={styles.date}>{new Date(transaction.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>
        {sign}${transaction.amount.toLocaleString()}
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
    borderBottomColor: '#eee',
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
    color: '#888',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
  },
});
