// Colores de Varo — ahora derivados de brand-kit/tokens.ts en vez de
// hex sueltos. Se conservan los mismos nombres de propiedad (bg, green,
// red, yellow...) para no tener que tocar los ~24 archivos que ya
// consumen `useTheme().colors`; lo único que cambió son los valores.
//
// green/red/yellow ya no son "colores planos" arbitrarios: green ES
// primary (= semantic.success), red ES danger, yellow ES warning.
// Ver ../../../../brand-kit/README.md para el porqué.
import { createAppTheme, brands } from './tokens';

const { light: base, dark: baseDark } = createAppTheme(brands.varo);

export const lightColors = {
  bg: base.background,
  bgCard: base.cardBg,
  bgSecondary: base.surfaceAlt,
  bgModalOverlay: base.overlay,
  text: base.text,
  textSecondary: base.textSecondary,
  textTertiary: base.textTertiary,
  textMuted: base.textMuted,
  border: base.border,
  borderLight: base.borderLight,
  green: base.primary,
  greenLight: base.primarySoft,
  red: base.danger,
  yellow: base.warning,
  progressBg: base.skeleton,
  inputBg: base.inputBg,
};

export const darkColors = {
  bg: baseDark.background,
  bgCard: baseDark.cardBg,
  bgSecondary: baseDark.surfaceAlt,
  bgModalOverlay: baseDark.overlay,
  text: baseDark.text,
  textSecondary: baseDark.textSecondary,
  textTertiary: baseDark.textTertiary,
  textMuted: baseDark.textMuted,
  border: baseDark.border,
  borderLight: baseDark.borderLight,
  green: baseDark.primary,
  greenLight: baseDark.primarySoft,
  red: baseDark.danger,
  yellow: baseDark.warning,
  progressBg: baseDark.skeleton,
  inputBg: baseDark.inputBg,
};

export type ThemeColors = typeof lightColors;
