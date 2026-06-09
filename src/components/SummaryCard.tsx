import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  title: string;
  amount: number;
  color?: string;
  icon?: string;
  compact?: boolean;
}

export default function SummaryCard({ title, amount, color, icon, compact }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[compact ? styles.cardCompact : styles.card, { backgroundColor: colors.bgCard }]}>
      {icon && <Text style={compact ? styles.iconCompact : styles.icon}>{icon}</Text>}
      <Text style={[compact ? styles.titleCompact : styles.title, { color: colors.textTertiary }]}>{title}</Text>
      <Text style={[compact ? styles.amountCompact : styles.amount, { color: color || colors.text }]}>
        ${amount.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  cardCompact: {
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginHorizontal: 3,
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  iconCompact: {
    fontSize: 16,
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleCompact: {
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  amountCompact: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
