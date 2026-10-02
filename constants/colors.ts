/**
 * Jordan Tourism Guide — design tokens.
 * Warm terracotta-orange identity (#D88B69) + warm white + gold accents.
 * NOTE: export names are part of the app's component API — screens import
 * COLORS / RADIUS / SPACING / SHADOW / FONTS, so names stay stable.
 */
export const COLORS = {
  primary: '#D88B69', // terracotta orange — primary buttons, active states
  primaryDark: '#C17654', // deeper terracotta — pressed states, links
  primaryLight: '#F3D9CC', // soft peach — chips, soft fills
  background: '#FAFAF7', // warm white — app background
  surface: '#F8F9F7', // off white — sheets, tab bar
  card: '#FFFFFF',
  text: '#2A2320', // warm ink (never pure black)
  secondaryText: '#7A6F68', // warm gray
  muted: '#A39A93',
  border: '#EAE3DC',
  success: '#2E8B57',
  error: '#E74752',
  warning: '#D6A83A', // gold
  overlay: 'rgba(43,26,18,0.45)', // photo scrims
  searchBar: 'rgba(255,255,255,0.94)',
  // Brand extensions (warm darks for cinematic bands + gradients)
  deepGreen: '#4A2C1C',
  darkestGreen: '#2B1A12',
  darkTeal: '#5C3A24',
  softGreen: '#F9E9DC', // soft peach fills
  gold: '#D6A83A', // premium accents, stars
  sandstone: '#C47D4F',
  warmOrange: '#E49B24',
} as const;

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 } as const;
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const SHADOW = {
  card: {
    shadowColor: '#2B1A12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  fab: {
    shadowColor: '#2B1A12',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

export const FONTS = {
  regular: 'System', // iOS: SF Pro · Android: Roboto — premium system sans
  medium: 'System',
  bold: 'System',
} as const;

export const TOUCH_TARGET = 44;
