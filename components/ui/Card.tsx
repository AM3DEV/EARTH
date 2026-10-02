import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'warning' }) {
  const bg = tone === 'success' ? '#E3F3E9' : tone === 'warning' ? '#FAF0D7' : COLORS.softGreen;
  const fg = tone === 'success' ? COLORS.success : tone === 'warning' ? COLORS.gold : COLORS.primaryDark;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}
export function Stars({ value }: { value?: number | null }) {
  if (value === null || value === undefined) return null;
  const full = Math.round(value);
  return <Text style={s.stars}>{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))} {value.toFixed(1)}</Text>;
}
const s = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 14, ...SHADOW.card },
  badge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  stars: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },
});
