import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

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

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (toasts.length === 0) return null;

  const stackStyle = { top: insets.top + 8, width: width - 32 };

  return (
    <Animated.View style={[styles.stack, styles.stackLeft, stackStyle]}>
      {toasts.map((toast) => (
        <Animated.View key={toast.id} style={[styles.toast, { backgroundColor: colors.green }]}>
          <Text style={styles.icon}>✓</Text>
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      ))}
    </Animated.View>
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
