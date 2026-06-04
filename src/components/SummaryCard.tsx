import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  amount: number;
  color?: string;
}

export default function SummaryCard({ title, amount, color = '#333' }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, { color }]}>
        ${amount.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
