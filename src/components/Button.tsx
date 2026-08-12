import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { radius, motion } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /**
   * primary (relleno, color de marca) · danger (relleno, rojo) · ghost (texto, sin relleno)
   * Reemplaza al viejo `color={colors.x}` del Button nativo de RN.
   */
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botón estándar de la app. El `Button` nativo de react-native no acepta
 * borderRadius (ni se ve igual entre iOS/Android), así que este es el único
 * botón que debería usarse — ver brand-kit/README.md#botones.
 *
 * Radio y curva tomados de referencia del estilo de controles de Apple:
 * esquina "continua" (superelipse, no arco circular) + radio ligero.
 *
 * Feedback de tap: scale con `motion.spring.press` (Reanimated) — mismo
 * spring en las 6 apps, ver brand-kit/README.md#motion.
 */
export default function Button({ title, onPress, disabled, loading, variant = 'primary', style }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const background =
    variant === 'primary' ? colors.green : variant === 'danger' ? colors.red : 'transparent';
  const textColor = variant === 'ghost' ? colors.textSecondary : '#FFFFFF';
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, motion.spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
      style={[
        styles.base,
        { backgroundColor: background },
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    borderCurve: 'continuous', // esquina "continua" tipo iOS (RN 0.71+), no-op en Android
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
