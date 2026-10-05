import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

export type Mode = 'light' | 'dark';
export type Palette = { [K in keyof typeof COLORS]: string };

const KEY = 'jg-theme';

/** Warm dark palette — same terracotta identity, dark warm-brown surfaces. */
export const DARK: Palette = {
  ...COLORS,
  primary: '#E8A37E', // brightened terracotta — text-safe on dark surfaces
  primaryDark: '#D88B69', // lifted one step for links/icons on dark
  background: '#171210',
  surface: '#1F1713',
  card: '#251C17',
  text: '#F4EAE1',
  secondaryText: '#BFAEA1',
  muted: '#8C7C71',
  border: '#3A2C24',
  overlay: 'rgba(0,0,0,0.55)',
  searchBar: 'rgba(37,28,23,0.94)',
  primaryLight: '#4A2E1F',
  softGreen: '#3A2A20',
};

/** Flat screen palette used by the redesigned Profile / Tourist Guid screens. */
export type ScreenPal = {
  bg: string; card: string; cream: string; terra: string; terraDark: string;
  ink: string; muted: string; soft: string; line: string; chev: string; skel: string; press: string;
};

export const LIGHT_P: ScreenPal = {
  bg: '#F8F3ED', card: '#FFFFFF', cream: '#FFF9F4', terra: '#D88B69', terraDark: '#C17654',
  ink: '#26313A', muted: '#77736F', soft: '#F3DED2', line: '#E8D8CE', chev: '#A99A91',
  skel: '#EFE3D8', press: '#FDECEA',
};

export const DARK_P: ScreenPal = {
  bg: '#171210', card: '#251C17', cream: '#2A201A', terra: '#D88B69', terraDark: '#EAA27B',
  ink: '#F4EAE1', muted: '#BFAEA1', soft: '#3A2A20', line: '#3A2C24', chev: '#8C7C71',
  skel: '#332820', press: '#3A2620',
};

type Ctx = {
  mode: Mode;
  dark: boolean;
  colors: Palette;
  pal: ScreenPal;
  setMode: (m: Mode) => void;
  toggle: () => void;
};

const ThemeCtx = createContext<Ctx>({
  mode: 'light', dark: false, colors: COLORS, pal: LIGHT_P, setMode: () => {}, toggle: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('light');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === 'dark' || v === 'light') setModeState(v); })
      .catch(() => {});
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  const value = useMemo<Ctx>(() => ({
    mode,
    dark: mode === 'dark',
    colors: mode === 'dark' ? DARK : COLORS,
    pal: mode === 'dark' ? DARK_P : LIGHT_P,
    setMode,
    toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  }), [mode]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
