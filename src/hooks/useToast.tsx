import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet, useWindowDimensions, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { motion, iconSize } from '../theme/tokens';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 2500);
    timersRef.current.set(id, timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  );
}

/** Entra deslizándose desde arriba (Animated de RN, sin librerías). */
function Toast({ message, color }: { message: string; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }).start();
  }, [progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });
  return (
    <Animated.View style={[styles.toast, { backgroundColor: color, opacity: progress, transform: [{ translateY }] }]}>
      <Icon name="check-circle" size={iconSize.sm} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (toasts.length === 0) return null;

  const stackStyle = { top: insets.top + 8, width: width - 32 };

  return (
    <View style={[styles.stack, styles.stackLeft, stackStyle]}>
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} color={colors.green} />
      ))}
    </View>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    zIndex: 9999,
    gap: 8,
  },
  stackLeft: {
    left: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
