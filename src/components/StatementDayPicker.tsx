import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: number;
  onChange: (day: number) => void;
}

export default function StatementDayPicker({ value, onChange }: Props) {
  const { colors } = useTheme();

  const step = (delta: number) => {
    onChange(Math.min(31, Math.max(1, value + delta)));
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
        onPress={() => step(-1)}
        disabled={value <= 1}
      >
        <Text style={[styles.btnText, { color: value <= 1 ? colors.textMuted : colors.text }]}>−</Text>
      </TouchableOpacity>

      <View style={styles.valueBox}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.suffix, { color: colors.textTertiary }]}>de cada mes</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
        onPress={() => step(1)}
        disabled={value >= 31}
      >
        <Text style={[styles.btnText, { color: value >= 31 ? colors.textMuted : colors.text }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  valueBox: {
    alignItems: 'center',
    minWidth: 90,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  suffix: {
    fontSize: 12,
    marginTop: -2,
  },
});
