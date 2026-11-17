import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import TransactionItem from '../components/TransactionItem';
import { useQuickAdd } from '../components/QuickAdd';
import LoadingScreen from '../components/LoadingScreen';
import ErrorMessage from '../components/ErrorMessage';
import { useTheme } from '../theme/ThemeContext';
import { motion, iconSize } from '../theme/tokens';
import { parseIsoDate, todayIso, toIsoDate } from '../utils/dates';
import { categoryStyle } from '../utils/categoryStyle';
import { money } from '../utils/money';
import type { Transaction } from '../types';

interface ScannedReceipt {
  amount: number;
  category: string;
  note: string;
  date: string;
  type: 'EXPENSE';
}

type Filter = 'ALL' | 'EXPENSE' | 'INCOME';
type Sort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
const SORT_LABEL: Record<Sort, string> = {
  'date-desc': 'Recientes',
  'date-asc': 'Antiguos',
  'amount-desc': 'Mayor monto',
  'amount-asc': 'Menor monto',
};
const SORTS = Object.keys(SORT_LABEL) as Sort[];

function dayLabel(iso: string) {
  const today = todayIso();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === today) return 'Hoy';
  if (iso === toIsoDate(y)) return 'Ayer';
  const label = parseIsoDate(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const quickAdd = useQuickAdd();
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [fabProgress] = useState(() => new Animated.Value(0));
  const [scanLoading, setScanLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState('');
  const [categoryPicker, setCategoryPicker] = useState(false);
  const [sort, setSort] = useState<Sort>('date-desc');
  const [refreshing, setRefreshing] = useState(false);

  // Misma llave que Inicio y el registro rápido: filtrar y ordenar aquí, sin otra petición.
  const { data: transactions, isLoading, isError, refetch } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/transactions')).data,
  });

  const usedCategories = useMemo(
    () => [...new Set((transactions ?? []).map(t => t.category))].sort(),
    [transactions],
  );

  const sections = useMemo(() => {
    const list = (transactions ?? [])
      .filter(t => (filter === 'ALL' || t.type === filter) && (!category || t.category === category))
      .sort((a, b) => {
        const [key, dir] = sort.split('-');
        const d = key === 'date' ? a.date.localeCompare(b.date) : Number(a.amount) - Number(b.amount);
        return dir === 'asc' ? d : -d;
      });
    if (sort.startsWith('amount')) return list.length ? [{ title: SORT_LABEL[sort], total: 0, data: list }] : [];
    const byDay = new Map<string, Transaction[]>();
    for (const t of list) {
      const day = t.date.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), t]);
    }
    return [...byDay.entries()].map(([day, data]) => ({
      title: dayLabel(day),
      total: data.reduce((s, t) => s + (t.type === 'EXPENSE' ? Number(t.amount) : 0), 0),
      data,
    }));
  }, [transactions, filter, category, sort]);

  useEffect(() => {
    Animated.spring(fabProgress, { toValue: fabMenuVisible ? 1 : 0, ...motion.spring.gentle, useNativeDriver: true }).start();
  }, [fabMenuVisible, fabProgress]);

  // El ticket escaneado se revisa en la misma hoja del registro rápido.
  const pickImage = (fromCamera: boolean) => {
    setFabMenuVisible(false);
    const launcher = fromCamera ? launchCamera : launchImageLibrary;
    launcher(
      { mediaType: 'photo', includeBase64: true, maxWidth: 600, maxHeight: 600, quality: 0.5 },
      async response => {
        const asset = response.assets?.[0];
        if (response.didCancel || response.errorCode || !asset?.base64) return;
        const imageUri = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
        const sizeMB = imageUri.length / (1024 * 1024);
        if (sizeMB > 1.5) {
          Alert.alert(
            'Imagen muy grande',
            `La imagen pesa ${sizeMB.toFixed(1)}MB. Intenta sacarla más cercana al ticket o con menos resolución.`,
          );
          return;
        }
        setScanLoading(true);
        try {
          const data = (await api.post('/transactions/scan-receipt', { image: imageUri })).data as ScannedReceipt;
          quickAdd.open({
            type: data.type ?? 'EXPENSE',
            amount: Number(data.amount) || undefined,
            category: data.category,
            note: data.note,
            date: data.date,
          });
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.message || 'No se pudo procesar el ticket');
        } finally {
          setScanLoading(false);
        }
      },
    );
  };

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorMessage message="No se pudieron cargar los movimientos." onRetry={refetch} />;

  const chip = (selected: boolean) => [
    styles.chip,
    { borderColor: colors.border, backgroundColor: colors.bgCard },
    selected && { borderColor: colors.green, backgroundColor: colors.greenLight },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Filtros en una sola fila */}
      <View style={styles.filters}>
        {(['ALL', 'EXPENSE', 'INCOME'] as Filter[]).map(f => (
          <TouchableOpacity key={f} style={chip(filter === f)} onPress={() => setFilter(f)}>
            <Text style={[styles.chipText, { color: filter === f ? colors.green : colors.textSecondary }]}>
              {f === 'ALL' ? 'Todos' : f === 'EXPENSE' ? 'Gastos' : 'Ingresos'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={chip(!!category)} onPress={() => setCategoryPicker(true)}>
          <Text style={[styles.chipText, { color: category ? colors.green : colors.textSecondary }]} numberOfLines={1}>
            {category || 'Categoría'} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length])}
          accessibilityLabel={`Orden: ${SORT_LABEL[sort]}`}
        >
          <Icon name="sort" size={iconSize.md} color={sort === 'date-desc' ? colors.textSecondary : colors.green} />
        </TouchableOpacity>
      </View>
      {sort !== 'date-desc' && (
        <Text style={[styles.sortHint, { color: colors.textMuted }]}>Orden: {SORT_LABEL[sort]}</Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={t => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refetch();
              setRefreshing(false);
            }}
            tintColor={colors.green}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            {section.total > 0 && (
              <Text style={[styles.sectionTotal, { color: colors.textMuted }]}>−{money(section.total)}</Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => quickAdd.open({ edit: item })}>
            <TransactionItem transaction={item} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="receipt-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {filter !== 'ALL' || category ? 'Nada con estos filtros.' : 'Aún no hay movimientos. Toca + para registrar uno.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.green }]}
        onPress={() => {
          setFabMenuVisible(false);
          quickAdd.open();
        }}
        activeOpacity={0.8}
        accessibilityLabel="Registrar gasto"
      >
        <Text style={[styles.fabText, { color: colors.bg }]}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.scanFab, { backgroundColor: colors.bgCard, borderColor: colors.green }]}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
        activeOpacity={0.8}
        accessibilityLabel="Escanear ticket"
      >
        <Icon name="camera-outline" size={iconSize.md} color={colors.green} />
      </TouchableOpacity>

      {[
        { icon: 'image-multiple-outline', label: 'Escanear de galería', onPress: () => pickImage(false) },
        { icon: 'camera', label: 'Escanear con cámara', onPress: () => pickImage(true) },
      ].map((item, i) => (
        <FabMenuItem
          key={i}
          index={i}
          progress={fabProgress}
          visible={fabMenuVisible}
          icon={item.icon}
          label={item.label}
          onPress={item.onPress}
          bgCard={colors.bgCard}
          textColor={colors.text}
        />
      ))}

      {scanLoading && (
        <View style={[styles.scanOverlay, { backgroundColor: colors.bgModalOverlay }]}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.scanText, { color: colors.text }]}>Analizando ticket...</Text>
        </View>
      )}

      <Modal visible={categoryPicker} transparent animationType="fade" onRequestClose={() => setCategoryPicker(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.bgModalOverlay }]} onPress={() => setCategoryPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <ScrollView contentContainerStyle={styles.options}>
              {['', ...usedCategories].map(name => (
                <TouchableOpacity
                  key={name || '_all'}
                  style={chip(category === name)}
                  onPress={() => {
                    setCategory(name);
                    setCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>
                    {name ? (
                      <>
                        <Icon name={categoryStyle(name).icon} size={14} color={categoryStyle(name).color} /> {name}
                      </>
                    ) : (
                      'Todas'
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function FabMenuItem({
  index,
  progress,
  visible,
  icon,
  label,
  onPress,
  bgCard,
  textColor,
}: {
  index: number;
  progress: Animated.Value;
  visible: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  bgCard: string;
  textColor: string;
}) {
  const itemStyle = {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20 * (index + 1), 0] }) }],
  };
  return (
    <Animated.View
      style={[styles.fabMenuItemWrapper, itemStyle, { bottom: 84 + index * 52 }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity style={[styles.fabMenuItem, { backgroundColor: bgCard }]} onPress={onPress}>
        <Icon name={icon} size={iconSize.sm} color={textColor} />
        <Text style={[styles.fabMenuText, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 140 },
  chipText: { fontSize: 13 },
  sortBtn: { marginLeft: 'auto', padding: 6 },
  sortHint: { fontSize: 12, paddingHorizontal: 16, marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  sectionTotal: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 64, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  scanFab: {
    position: 'absolute',
    right: 88,
    bottom: 28,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 10,
  },
  fabText: { fontSize: 28, fontWeight: '600', marginTop: -2 },
  fabMenuItemWrapper: { position: 'absolute', right: 20, zIndex: 9 },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 3,
  },
  fabMenuText: { fontSize: 14, fontWeight: '500' },
  scanOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  scanText: { marginTop: 12, fontSize: 16 },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, padding: 16, maxHeight: '70%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
