import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Forecast, FinancialObjective } from '../types';

interface Props {
  forecast: Forecast;
  goal: FinancialObjective;
  compact?: boolean;
}

export default function ForecastWidget({ forecast, goal, compact }: Props) {
  const { colors } = useTheme();
  const date = new Date(forecast.estimatedDate);
  const formattedDate = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });

  const goalCurrent = Number(goal.currentAmount);
  const goalTarget = Number(goal.targetAmount);
  const safeProgress = Math.min(100, Math.max(0, (goalCurrent / Math.max(goalTarget, 1)) * 100));

  let stateColor = colors.yellow;
  let stateLabel = 'En camino';

  if (safeProgress > 50 && forecast.trend === 'up') {
    stateColor = colors.green;
    stateLabel = 'Vas bien';
  } else if (safeProgress < 25 || forecast.trend === 'down') {
    stateColor = colors.red;
    stateLabel = 'Ajusta tu ritmo';
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.bgCard }]}>
        <View style={styles.compactTop}>
          <View style={styles.compactInfo}>
            <Text style={[styles.compactGoalName, { color: colors.text }]}>{forecast.goalName}</Text>
            <Text style={[styles.compactAmounts, { color: colors.textSecondary }]}>
              ${Math.round(goalCurrent).toLocaleString()} / ${Math.round(goalTarget).toLocaleString()}
            </Text>
            <View style={styles.compactProgressRow}>
              <View style={[styles.compactProgressBg, { backgroundColor: colors.progressBg }]}>
                <View style={[styles.compactProgressFill, { width: `${safeProgress}%`, backgroundColor: stateColor }]} />
              </View>
              <Text style={[styles.compactProgressPercent, { color: stateColor }]}>{Math.round(safeProgress)}%</Text>
            </View>
          </View>
          <View style={styles.compactDaysBox}>
            <Text style={[styles.compactDaysNumber, { color: colors.text }]}>{forecast.estimatedDays}</Text>
            <Text style={[styles.compactDaysLabel, { color: colors.textSecondary }]}>días</Text>
          </View>
        </View>
        <View style={styles.compactBottom}>
          <Text style={[styles.compactInfoText, { color: colors.textSecondary }]}>📅 {formattedDate}</Text>
          <Text style={[styles.compactInfoText, { color: colors.textSecondary }]}>💰 ${Math.round(forecast.monthlyNeeded).toLocaleString()}/mes</Text>
          <View style={[styles.compactBadge, { backgroundColor: stateColor }]}>
            <Text style={styles.compactBadgeText}>{stateLabel}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.goalName, { color: colors.text }]}>{forecast.goalName}</Text>

      <View style={styles.countdownBox}>
        <Text style={[styles.countdownNumber, { color: colors.text }]}>{forecast.estimatedDays.toLocaleString()}</Text>
        <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>días</Text>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.progressBg }]}>
          <View style={[styles.progressBarFill, styles.fillBar, { width: `${safeProgress}%`, backgroundColor: stateColor }]} />
        </View>
        <Text style={[styles.progressPercent, { color: stateColor }]}>{Math.round(safeProgress)}%</Text>
      </View>

      <Text style={[styles.amounts, { color: colors.textSecondary }]}>
        ${Math.round(goalCurrent).toLocaleString()} / ${Math.round(goalTarget).toLocaleString()}
      </Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>📅</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>{formattedDate}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>💰</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          ${Math.round(forecast.monthlyNeeded).toLocaleString()} / mes
        </Text>
      </View>

      {forecast.savingAllocation > 0 && forecast.savingAllocation < 100 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📊</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {forecast.savingAllocation}% de tu ahorro (${Math.round(forecast.totalMonthlySaving).toLocaleString()}/mes)
          </Text>
        </View>
      )}

      <View style={[styles.stateBadge, { backgroundColor: stateColor }]}>
        <Text style={styles.stateBadgeText}>
          {stateLabel}, {forecast.estimatedDays} días
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  countdownBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    lineHeight: 60,
  },
  countdownLabel: {
    fontSize: 16,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
  fillBar: {
    borderLeftWidth: 0,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  amounts: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
  },
  stateBadge: {
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  stateBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  compactContainer: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
    marginRight: 16,
  },
  compactGoalName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  compactAmounts: {
    fontSize: 14,
    marginBottom: 10,
  },
  compactProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactProgressBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: 10,
    borderRadius: 5,
  },
  compactProgressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  compactDaysBox: {
    alignItems: 'center',
  },
  compactDaysNumber: {
    fontSize: 44,
    fontWeight: 'bold',
    lineHeight: 46,
  },
  compactDaysLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  compactBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  compactInfoText: {
    fontSize: 14,
  },
  compactBadge: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginLeft: 'auto',
  },
  compactBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
