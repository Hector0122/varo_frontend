import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Forecast } from '../types';

interface Props {
  forecast: Forecast;
}

export default function ForecastWidget({ forecast }: Props) {
  const trendColor =
    forecast.trend === 'up' ? '#2e7d32' : forecast.trend === 'down' ? '#c62828' : '#f9a825';

  const trendText =
    forecast.trend === 'up' ? 'Avanzando' : forecast.trend === 'down' ? 'Alejándote' : 'Estable';

  const date = new Date(forecast.estimatedDate);
  const formattedDate = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fecha estimada</Text>
      <Text style={styles.date}>{formattedDate}</Text>
      <Text style={styles.days}>{forecast.estimatedDays} días restantes</Text>
      <View style={[styles.badge, { backgroundColor: trendColor }]}>
        <Text style={styles.badgeText}>{trendText}</Text>
      </View>
      <Text style={styles.impact}>
        Si mantienes este ritmo llegarás en {Math.ceil(forecast.estimatedDays / 30)} meses.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#666',
  },
  date: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  days: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1b5e20',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  impact: {
    marginTop: 8,
    fontSize: 13,
    color: '#555',
  },
});
