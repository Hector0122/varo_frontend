import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Goal } from '../types';

interface Props {
  goal: Goal;
}

export default function GoalCard({ goal }: Props) {
  const { colors } = useTheme();
  const progress = Number(goal.targetAmount) > 0 ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
      <Text style={[styles.name, { color: colors.text }]}>{goal.name}</Text>
      <View style={[styles.progressBarBackground, { backgroundColor: colors.progressBg }]}>
        <View style={[styles.progressBarFill, { backgroundColor: colors.green }, { width: `${Math.min(progress, 100)}%` }]} />
      </View>
      <Text style={[styles.amounts, { color: colors.textSecondary }]}>
        ${Number(goal.currentAmount).toLocaleString()} / ${Number(goal.targetAmount).toLocaleString()}
      </Text>
      <Text style={[styles.percentage, { color: colors.green }]}>{Math.round(progress)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  amounts: {
    fontSize: 14,
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
