import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import { iconSize, fontFamily } from '../theme/tokens';

interface Props {
  title: string;
  amount: number;
  color?: string;
  /** Nombre de icono MDI (react-native-vector-icons/MaterialCommunityIcons), no emoji — ver arcd_kit/README.md#iconos */
  icon?: string;
  compact?: boolean;
}

export default function SummaryCard({ title, amount, color, icon, compact }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[compact ? styles.cardCompact : styles.card, { backgroundColor: colors.bgCard }]}>
      {icon && (
        <Icon
          name={icon}
          size={compact ? iconSize.sm : iconSize.md}
          color={color || colors.textTertiary}
          style={compact ? styles.iconCompact : styles.icon}
        />
      )}
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
    marginBottom: 4,
  },
  iconCompact: {
    marginBottom: 2,
  },
  title: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleCompact: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontFamily: fontFamily.mono,
    fontSize: 18,
  },
  amountCompact: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
  },
});
