import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Button,
} from 'react-native';
import { Controller, Control } from 'react-hook-form';
import { useTheme } from '../theme/ThemeContext';
import type { Category } from '../types';

interface TransactionFormValues {
  amount: string;
  category: string;
  note: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
}

interface Props {
  control: Control<TransactionFormValues>;
  selectedType: 'INCOME' | 'EXPENSE';
  categories: Category[] | undefined;
  showCategoryInput: boolean;
  setShowCategoryInput: (v: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel?: string;
}

export default function TransactionForm({
  control,
  selectedType,
  categories,
  showCategoryInput,
  setShowCategoryInput,
  onSubmit,
  onCancel,
  isPending,
  submitLabel = 'Guardar',
}: Props) {
  const { colors } = useTheme();

  const filteredTags = categories?.filter(
    c => c.type === selectedType || c.type === 'BOTH',
  );

  const renderTypeSelector = (
    onChange: (v: 'INCOME' | 'EXPENSE') => void,
    value: 'INCOME' | 'EXPENSE',
  ) => (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeBtn,
            { borderColor: colors.border },
            value === 'INCOME' && {
              backgroundColor: colors.greenLight,
              borderColor: colors.green,
            },
          ]}
          onPress={() => onChange('INCOME')}
        >
          <Text>💰 Ingreso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeBtn,
            { borderColor: colors.border },
            value === 'EXPENSE' && {
              backgroundColor: colors.greenLight,
              borderColor: colors.green,
            },
          ]}
          onPress={() => onChange('EXPENSE')}
        >
          <Text>💸 Gasto</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderCategorySelector = (
    onChange: (v: string) => void,
    value: string,
  ) => (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Categoría
      </Text>
      {filteredTags && filteredTags.length > 0 && !showCategoryInput && (
        <View style={styles.tagRow}>
          {filteredTags.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.tag,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                },
                value === cat.name && {
                  backgroundColor: colors.greenLight,
                  borderColor: colors.green,
                },
              ]}
              onPress={() => onChange(cat.name)}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: colors.textSecondary },
              value === cat.name && { color: colors.green, ...styles.fontWeight600 },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.tagAdd,
              { backgroundColor: colors.bg, borderColor: colors.green },
            ]}
            onPress={() => setShowCategoryInput(true)}
          >
            <Text style={[styles.tagAddText, { color: colors.green }]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
      {(showCategoryInput || !filteredTags || filteredTags.length === 0) && (
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Ej: Comida, Transporte, Sueldo..."
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChange}
        />
      )}
      {showCategoryInput && (
        <TouchableOpacity onPress={() => setShowCategoryInput(false)}>
          <Text style={[styles.backToTags, { color: colors.green }]}>
            ← Ver categorías guardadas
          </Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <>
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) =>
          renderTypeSelector(onChange, value)
        }
      />

      <Controller
        control={control}
        name="amount"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Monto
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Ej: 500"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
            />
          </>
        )}
      />

      <Controller
        control={control}
        name="category"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) =>
          renderCategorySelector(onChange, value)
        }
      />

      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nota
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholderTextColor={colors.textMuted}
              placeholder="Opcional: descripción del movimiento"
              value={value}
              onChangeText={onChange}
            />
          </>
        )}
      />

      <Controller
        control={control}
        name="date"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Fecha
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholderTextColor={colors.textMuted}
              placeholder="YYYY-MM-DD"
              value={value}
              onChangeText={onChange}
            />
          </>
        )}
      />

      <Button
        title={isPending ? 'Guardando...' : submitLabel}
        onPress={onSubmit}
        disabled={isPending}
      />
      <View style={styles.cancelBtn}>
        <Button
          title="Cancelar"
          onPress={onCancel}
          color={colors.textTertiary}
        />
      </View>
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
  typeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
  },
  tagAdd: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  tagAddText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToTags: {
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
  },
  cancelBtn: {
    marginTop: 8,
  },
  fontWeight600: {
    fontWeight: '600',
  },
});
