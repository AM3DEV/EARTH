import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { BounceIn } from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { formatMoney } from '../../lib/pricing';
import { bookingStatusKey } from '../../lib/status';

export default function BookingDetail() {
  const { colors: C } = useTheme();
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

  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;
  if (error || !row) return <ErrorState message={error ?? t('common.error')} />;
  const stKey = bookingStatusKey(row.status);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={[C.darkestGreen, C.deepGreen]} style={s.band}>
        <Animated.View entering={BounceIn.duration(500)} style={s.ok}>
          <CheckCircle2 color="#FFFFFF" size={56} />
          <Text style={s.title}>{t('booking.confirmed')}</Text>
          <Text style={s.ref}>{t('booking.reference')}: {row.booking_reference}</Text>
        </Animated.View>
      </LinearGradient>
      <View style={s.content}>
        <PriceBreakdown quote={{ base_price: row.base_price, dynamic_price: row.dynamic_price, support_discount_percentage: row.support_discount_percentage, support_discount_amount: row.support_discount_amount, coupon_discount_amount: row.coupon_discount_amount ?? 0, final_price: row.final_price, currency: row.currency }} />
        <View style={s.meta}>
          <Text style={s.muted}>{t('booking.date')}: {row.booking_date.slice(0, 10)} · {t('booking.rQty')}: {row.quantity}</Text>
          <Text style={s.muted}>{t('booking.rCap')}: {row.capacity_percentage ?? '—'}% · +{row.price_increase_percentage ?? 0}%</Text>
          <Text style={s.muted}>{t('booking.status')}: {stKey ? t(stKey) : row.status} · {formatMoney(row.final_price, row.currency)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  band: { paddingTop: 92, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  ok: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 12 },
  ref: { color: C.gold, fontWeight: '800', marginTop: 6, fontSize: 15, letterSpacing: 0.5 },
  content: { padding: 20 },
  meta: { marginTop: 14, gap: 4, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: 14 },
  muted: { color: C.secondaryText },
});
