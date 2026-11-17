import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import { categoryStyle } from '../utils/categoryStyle';
import { money } from '../utils/money';

const TOP = 6;

/** Gastos del mes por categoría con barras hechas de View (sin librería de gráficas). */
export default function CategoryBreakdown({ items }: { items: { category: string; total: number }[] }) {
  const { colors } = useTheme();
  if (!items.length) return null;
  const rest = items.slice(TOP).reduce((s, i) => s + i.total, 0);
  const rows = rest ? [...items.slice(0, TOP), { category: 'Otras', total: rest }] : items;
  const sum = items.reduce((s, i) => s + i.total, 0);
  const max = rows[0].total;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
      {rows.map(({ category, total }) => {
        const { icon, color } = categoryStyle(category);
        return (
          <View key={category} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                <Icon name={icon} size={14} color={color} /> {category}
              </Text>
              <Text style={[styles.value, { color: colors.textSecondary }]}>
                {money(total)} · {Math.round((total / sum) * 100)}%
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.progressBg }]}>
              <View style={[styles.bar, { backgroundColor: color, width: `${(total / max) * 100}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, gap: 12, marginBottom: 8 },
  row: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
});
