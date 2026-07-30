import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import { objectivesApi } from '../services/objectives';
import LoadingScreen from './LoadingScreen';
import type { ObjectiveEntry } from '../types';

interface Props {
  visible: boolean;
  goalId: string;
  goalName: string;
  onClose: () => void;
}

export default function GoalContributionHistoryModal({ visible, goalId, goalName, onClose }: Props) {
  const { colors } = useTheme();
  const { data: contributions, isLoading } = useQuery<ObjectiveEntry[]>({
    queryKey: ['goal-contributions', goalId],
    queryFn: () => objectivesApi.getEntries(goalId),
    enabled: visible,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]}>
        <View style={[styles.content, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Historial - {goalName}
          </Text>

          {isLoading ? (
            <LoadingScreen />
          ) : contributions && contributions.length > 0 ? (
            <FlatList
              data={contributions}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowType, { color: colors.text }]}>
                      {item.type === 'ADD' ? '💰 Ahorro' : '📤 Retiro'}
                    </Text>
                    <Text style={[styles.rowDate, { color: colors.textMuted }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                    {item.note && (
                      <Text style={[styles.rowNote, { color: colors.textTertiary }]} numberOfLines={2}>
                        {item.note}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.rowAmount,
                    { color: item.type === 'ADD' ? colors.green : colors.red },
                  ]}>
                    {item.type === 'ADD' ? '+' : '-'}${Number(item.amount).toLocaleString()}
                  </Text>
                </View>
              )}
            />
          ) : (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>
              Sin movimientos registrados.
            </Text>
          )}

          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.green }]} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flex: 1,
  },
  rowType: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowDate: {
    fontSize: 12,
    marginTop: 2,
  },
  rowNote: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 32,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
