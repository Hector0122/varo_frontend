import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: string; // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  label?: string;
}

function parseIsoDate(value: string): Date {
  const [y, m, d] = (value || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DateField({ value, onChange, label = 'Fecha' }: Props) {
  const { colors, mode } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseIsoDate(value));

  const selectedDate = parseIsoDate(value);
  const formatted = selectedDate.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const openPicker = () => {
    setDraftDate(selectedDate);
    setPickerVisible(true);
  };

  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setPickerVisible(false);
    if (event.type === 'set' && selected) {
      onChange(toIsoDate(selected));
    }
  };

  return (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.fieldRow, { borderColor: colors.border }]}
        onPress={openPicker}
      >
        <Text style={{ color: colors.text }}>{formatted}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && pickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]}>
            <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                themeVariant={mode}
                onChange={(_event, selected) => selected && setDraftDate(selected)}
              />
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={[styles.actionText, { color: colors.textTertiary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChange(toIsoDate(draftDate));
                    setPickerVisible(false);
                  }}
                >
                  <Text style={[styles.actionText, { color: colors.green }]}>Listo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
});
