export const COLORS = {
  primary: '#D88B69',
  primaryDark: '#C17654',
  primaryLight: '#F3D9CC',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  card: '#FFFFFF',
  text: '#171717',
  secondaryText: '#707070',
  border: '#E6E6E6',
  success: '#2E8B57',
  error: '#D9534F',
  warning: '#D99A2B',
  overlay: 'rgba(0,0,0,0.35)',
  searchBar: 'rgba(255,255,255,0.9)',
} as const;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, full: 999 } as const;
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

export const TOUCH_TARGET = 44;
