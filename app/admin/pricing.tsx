import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { formatMoney } from '../../lib/pricing';

/** Pricing Management: service/event, base, bookings, cap%, current price, increase, support generated/target. */
export default function PricingScreen() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('services').select('*').order('current_booking', { ascending: false }).limit(200);
      const withQuotes = await Promise.all((data ?? []).map(async (sv: any) => {
        const { data: q } = await supabase.rpc('calculate_price_quote', { p_service_id: sv.id });
        return { ...sv, quote: q };
      }));
      setRows(withQuotes);
      setLoading(false);
    })();
  }, []);
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.pricing')} />
      {rows.length === 0 ? <EmptyState /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>{item.name_en}</Text>
              <Text style={s.muted}>{t('booking.rBase')} {formatMoney(item.base_price, item.currency)} · {item.current_booking}/{item.max_booking} ({item.quote?.capacity_percentage ?? '—'}%)</Text>
              <Text style={s.muted}>{t('booking.rIncrease')} +{item.quote?.price_increase_percentage ?? 0}% · {t('booking.rCurrent')} {formatMoney(item.quote?.dynamic_price ?? item.current_price, item.currency)}</Text>
              <Text style={s.muted}>{t('booking.rSupport')} {item.quote?.support_discount_percentage ?? 0}% · {t('booking.rFinal')} {formatMoney(item.quote?.final_price ?? item.current_price, item.currency)}</Text>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
});
