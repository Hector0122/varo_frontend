import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  trend: 'up' | 'stable' | 'down';
}

export default function TrendBadge({ trend }: Props) {
  const colors = {
    up: '#2e7d32',
    stable: '#f9a825',
    down: '#c62828',
  };

  const labels = {
    up: 'Vas bien',
    stable: 'Estable',
    down: 'Ajusta tu ritmo',
  };

  return (
    <View style={[styles.badge, { backgroundColor: colors[trend] }]}>
      <Text style={styles.text}>{labels[trend]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
