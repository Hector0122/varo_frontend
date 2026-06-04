import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Forecast, Goal } from '../types';

interface Props {
  forecast: Forecast;
  goal: Goal;
}

export default function ForecastWidget({ forecast, goal }: Props) {
  const date = new Date(forecast.estimatedDate);
  const formattedDate = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });

  // Progreso real: currentAmount / targetAmount
  const safeProgress = Math.min(100, Math.max(0, (goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100));

  // Determinar color de estado según progreso y tendencia
  let stateColor = '#f9a825'; // amarillo
  let stateLabel = 'En camino';
  let stateSub = `${forecast.estimatedDays} días`;

  if (safeProgress > 50 && forecast.trend === 'up') {
    stateColor = '#2e7d32'; // verde
    stateLabel = 'Vas bien';
  } else if (safeProgress < 25 || forecast.trend === 'down') {
    stateColor = '#c62828'; // rojo
    stateLabel = 'Ajusta tu ritmo';
  }

  return (
    <View style={[styles.container, { borderLeftColor: stateColor, borderLeftWidth: 4 }]}>
      {/* Nombre de meta */}
      <Text style={styles.goalName}>{forecast.goalName}</Text>

      {/* Número grande: días restantes */}
      <View style={styles.countdownBox}>
        <Text style={styles.countdownNumber}>{forecast.estimatedDays.toLocaleString()}</Text>
        <Text style={styles.countdownLabel}>días</Text>
      </View>

      {/* Barra de progreso + porcentaje */}
      <View style={styles.progressRow}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${safeProgress}%`, backgroundColor: stateColor }]} />
        </View>
        <Text style={[styles.progressPercent, { color: stateColor }]}>{Math.round(safeProgress)}%</Text>
      </View>

      {/* Montos */}
      <Text style={styles.amounts}>
        ${Math.round(goal.currentAmount).toLocaleString()} / ${Math.round(goal.targetAmount).toLocaleString()}
      </Text>

      {/* Fecha estimada */}
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>📅</Text>
        <Text style={styles.infoText}>{formattedDate}</Text>
      </View>

      {/* Ahorro mensual necesario */}
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>💰</Text>
        <Text style={styles.infoText}>
          ${Math.round(forecast.monthlyNeeded).toLocaleString()} / mes necesarios
        </Text>
      </View>

      {/* Badge de estado */}
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
    backgroundColor: '#fff',
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
    color: '#333',
  },
  countdownBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#1b5e20',
    lineHeight: 60,
  },
  countdownLabel: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  amounts: {
    fontSize: 14,
    color: '#555',
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
    color: '#555',
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
});
