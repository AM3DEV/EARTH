import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, SHADOW } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';

export function Card({ children }: { children: React.ReactNode }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  return <View style={s.card}>{children}</View>;
}
export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'warning' }) {
  const { colors: C } = useTheme();
  const bg = tone === 'success' ? '#E3F3E9' : tone === 'warning' ? '#FAF0D7' : C.softGreen;
  const fg = tone === 'success' ? C.success : tone === 'warning' ? C.gold : C.primaryDark;
  return (
    <View style={[sBase.badge, { backgroundColor: bg }]}>
      <Text style={[sBase.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}
export function Stars({ value }: { value?: number | null }) {
  if (value === null || value === undefined) return null;
  const full = Math.round(value);
  return <Text style={sBase.stars}>{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))} {value.toFixed(1)}</Text>;
}
const getStyles = (C: Palette) => StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, padding: 14, ...SHADOW.card },
});
const sBase = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  stars: { color: '#D6A83A', fontSize: 13, fontWeight: '700' },
});
