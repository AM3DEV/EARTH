import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { BounceIn } from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { formatMoney } from '../../lib/pricing';

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('bookings').select('*, services(name_en,name_ar), companies(name_en,name_ar)').eq('id', id).maybeSingle();
        if (error) throw error;
        setRow(data);
      } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !row) return <ErrorState message={error ?? 'Error'} />;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 20, paddingTop: 70 }}>
      <Animated.View entering={BounceIn.duration(500)} style={s.ok}>
        <CheckCircle2 color={COLORS.success} size={56} />
        <Text style={s.title}>{t('booking.confirmed')}</Text>
        <Text style={s.ref}>{t('booking.reference')}: {row.booking_reference}</Text>
      </Animated.View>
      <View style={{ height: 16 }} />
      <PriceBreakdown quote={{ base_price: row.base_price, dynamic_price: row.dynamic_price, support_discount_percentage: row.support_discount_percentage, support_discount_amount: row.support_discount_amount, final_price: row.final_price, currency: row.currency }} />
      <View style={s.meta}>
        <Text style={s.muted}>Date: {row.booking_date.slice(0, 10)} · Qty: {row.quantity}</Text>
        <Text style={s.muted}>Capacity: {row.capacity_percentage ?? '—'}% · +{row.price_increase_percentage ?? 0}%</Text>
        <Text style={s.muted}>Status: {row.status} · {formatMoney(row.final_price, row.currency)}</Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  ok: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 10 },
  ref: { color: COLORS.primaryDark, fontWeight: '700', marginTop: 4 },
  meta: { marginTop: 14, gap: 4 },
  muted: { color: COLORS.secondaryText },
});
