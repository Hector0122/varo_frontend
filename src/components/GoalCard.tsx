import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Goal } from '../types';

interface Props {
  goal: Goal;
}

export default function GoalCard({ goal }: Props) {
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{goal.name}</Text>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
      </View>
      <Text style={styles.amounts}>
        ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
      </Text>
      <Text style={styles.percentage}>{Math.round(progress)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#2e7d32',
    borderRadius: 4,
  },
  amounts: {
    fontSize: 14,
    color: '#555',
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 4,
  },
});
