import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBookings } from '../hooks/useBookings';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { COLORS } from '../constants/colors';
import { formatMoney } from '../lib/pricing';

export default function BookingsScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { rows, loading, error, reload } = useBookings();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('booking.myBookings')}</Text>
      {rows.length === 0 ? <EmptyState message={t('booking.noBookings')} /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push(`/booking/${item.id}` as any)}>
              <Text style={s.ref}>{item.booking_reference}</Text>
              <Text style={s.name}>{lang === 'ar' ? item.services?.name_ar : item.services?.name_en}</Text>
              <Text style={s.muted}>{item.booking_date.slice(0, 10)} · {formatMoney(item.final_price, item.currency)} · {item.status}</Text>
            </Pressable>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  ref: { fontWeight: '800', color: COLORS.primaryDark },
  name: { fontWeight: '700', color: COLORS.text, marginTop: 2 },
  muted: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
});
