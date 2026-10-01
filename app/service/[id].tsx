import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { createBookingServer } from '../../hooks/useBookings';
import { Badge } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState('1');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*, companies(name_en,name_ar)').eq('id', id).maybeSingle();
    setRow(data);
    if (data) {
      // Authoritative quote via RPC
      const { data: q } = await supabase.rpc('calculate_price_quote', { p_service_id: data.id });
      setQuote(q);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const book = async () => {
    setMsg(null); setBusy(true);
    try {
      const res: any = await createBookingServer({ service_id: id!, booking_date: new Date(date).toISOString(), quantity: Number(qty) || 1 });
      const bookingId = res?.booking_id ?? res?.id ?? res;
      router.push(`/booking/${bookingId}` as any);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      {row.image_url ? <Image source={{ uri: row.image_url }} style={s.hero} contentFit="cover" /> : null}
      <View style={s.body}>
        <Text style={s.name}>{name}</Text>
        <Text style={s.muted}>{(row.companies as any)?.name_en} · {row.current_booking}/{row.max_booking}</Text>
        {(quote?.support_discount_percentage ?? 0) > 0 ? <Badge label={t('support.badge', { pct: quote.support_discount_percentage })} tone="success" /> : null}
        <View style={{ height: 10 }} />
        <PriceBreakdown quote={quote ?? { base_price: row.base_price, dynamic_price: row.current_price, final_price: row.current_price, currency: row.currency }} />
        <View style={{ height: 14 }} />
        <Field label={t('booking.date')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label={t('booking.quantity')} value={qty} onChangeText={setQty} keyboardType="numeric" />
        {msg ? <Text style={s.err}>{msg}</Text> : null}
        <PrimaryButton title={busy ? '…' : t('booking.confirm')} onPress={book} disabled={busy} />
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  hero: { width: '100%', height: 230, backgroundColor: '#eee' },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  muted: { color: COLORS.secondaryText, marginTop: 4 },
  err: { color: COLORS.error, marginBottom: 8 },
});
