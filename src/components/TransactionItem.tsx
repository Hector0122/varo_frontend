import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import { isLinkedCategory } from '../constants/systemCategories';
import { categoryStyle } from '../utils/categoryStyle';
import { money } from '../utils/money';
import type { Transaction } from '../types';

export default function TransactionItem({ transaction }: { transaction: Transaction }) {
  const { colors } = useTheme();
  const isIncome = transaction.type === 'INCOME';
  const { icon, color } = categoryStyle(transaction.category);

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
      <View style={[styles.icon, { backgroundColor: color + '22' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
          {transaction.category}
          {isLinkedCategory(transaction.category) ? '  · auto' : ''}
        </Text>
        {!!transaction.note && (
          <Text style={[styles.note, { color: colors.textTertiary }]} numberOfLines={1}>
            {transaction.note}
          </Text>
        )}
      </View>
      <Text style={[styles.amount, { color: isIncome ? colors.green : colors.text }]}>
        {isIncome ? '+' : '−'}
        {money(Number(transaction.amount))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  category: { fontSize: 15, fontWeight: '500' },
  note: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '600' },
});
