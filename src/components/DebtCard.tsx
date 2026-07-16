import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Debt } from '../types';

interface Props {
  debt: Debt;
  compact?: boolean;
  onPress?: () => void;
  onHistory?: () => void;
  monthlySpending?: number;
  periodStart?: string;
  periodEnd?: string;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function DebtCard({ debt, compact, onPress, onHistory, monthlySpending, periodStart, periodEnd }: Props) {
  const { colors } = useTheme();
  const paid = Number(debt.totalAmount) - Number(debt.currentAmount);
  const progress = Number(debt.totalAmount) > 0 ? (paid / Number(debt.totalAmount)) * 100 : 0;

  const content = (
    <View style={[styles.card, { backgroundColor: colors.bgCard }, compact && styles.compactCard]}>
      <View style={styles.top}>
        <Text style={[styles.name, { color: colors.text }, compact && styles.compactName]} numberOfLines={1}>
          {debt.name}
        </Text>
        <Text style={[styles.badge, { color: colors.red }]}>
          ${Number(debt.currentAmount).toLocaleString()}
        </Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.progressBg }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.red, width: `${Math.min(progress, 100)}%` }]} />
      </View>
      <View style={styles.bottom}>
        <Text style={[styles.amounts, { color: colors.textTertiary }, compact && styles.compactAmounts]}>
          Pagado ${paid.toLocaleString()} de ${Number(debt.totalAmount).toLocaleString()}
        </Text>
        <Text style={[styles.percent, { color: colors.red }]}>
          {Math.round(progress)}%
        </Text>
      </View>
      {debt.dueDate && (
        <Text style={[styles.due, { color: colors.textMuted }]}>
          Vence: {new Date(debt.dueDate).toLocaleDateString()}
        </Text>
      )}
      {monthlySpending !== undefined && monthlySpending > 0 && (
        <Text style={[styles.monthlySpending, { color: colors.textMuted }]}>
          💳 Gasto del corte
          {periodStart && periodEnd ? ` (${shortDate(periodStart)} - ${shortDate(periodEnd)})` : ''}: $
          {monthlySpending.toLocaleString()}
        </Text>
      )}
    </View>
  );

  if (!onPress && !onHistory) return content;

  return (
    <View>
      {content}
      {onHistory && (
        <Text style={[styles.historyLink, { color: colors.green }]} onPress={onHistory}>
          📋 Ver historial
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  compactCard: {
    padding: 10,
    marginBottom: 6,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  compactName: {
    fontSize: 13,
  },
  badge: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amounts: {
    fontSize: 12,
  },
  compactAmounts: {
    fontSize: 11,
  },
  percent: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  due: {
    fontSize: 11,
    marginTop: 4,
  },
  monthlySpending: {
    fontSize: 11,
    marginTop: 2,
  },
  historyLink: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
    paddingRight: 4,
  },
});
