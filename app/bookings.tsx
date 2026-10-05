import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBookings } from '../hooks/useBookings';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { RADIUS, SHADOW } from '../constants/colors';
import { useTheme, Palette } from '../lib/theme';
import { usePrice } from '../lib/currency';
import { bookingStatusKey } from '../lib/status';
import { BackButton } from '../components/ui/BackButton';

export default function BookingsScreen() {
  const { colors: C } = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { rows, loading, error, reload } = useBookings();
  const { fmt } = usePrice();
  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <View style={s.wrap}>
      <BackButton />
      <Text style={s.title}>{t('booking.myBookings')}</Text>
      {rows.length === 0 ? <EmptyState message={t('booking.noBookings')} /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const st = String(item.status ?? '');
            const stKey = bookingStatusKey(st);
            const ok = st === 'confirmed' || st === 'completed';
            const wait = st === 'pending';
            return (
              <Pressable style={s.card} onPress={() => router.push(`/booking/${item.id}` as any)}>
                <View style={s.top}>
                  <Text style={s.ref}>{item.booking_reference}</Text>
                  <Text style={[s.pill, { backgroundColor: ok ? '#E3F3E9' : wait ? '#FAF0D7' : '#FDE7E9', color: ok ? C.success : wait ? '#A5760A' : C.error }]}>
                    {stKey ? t(stKey) : st}
                  </Text>
                </View>
                <Text style={s.name}>{lang === 'ar' ? item.services?.name_ar : item.services?.name_en}</Text>
                <Text style={s.muted}>{item.booking_date.slice(0, 10)} · {fmt(item.final_price, item.currency)}</Text>
              </Pressable>
            );
          }} />
      )}
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 110 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, paddingHorizontal: 16, marginBottom: 4 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: 14, marginBottom: 10, ...SHADOW.card },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ref: { fontWeight: '800', color: C.primaryDark, flex: 1 },
  pill: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, overflow: 'hidden' },
  name: { fontWeight: '700', color: C.text, marginTop: 2 },
  muted: { color: C.secondaryText, fontSize: 13, marginTop: 2 },
});
