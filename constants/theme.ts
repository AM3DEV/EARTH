import { COLORS, RADIUS, SPACING } from './colors';

export const theme = {
  colors: COLORS,
  radius: RADIUS,
  spacing: SPACING,
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    minHeight: 48,
  },
} as const;

export type Theme = typeof theme;
