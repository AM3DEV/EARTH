import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { fallbackPhoto } from '../../constants/photos';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { createBookingServer } from '../../hooks/useBookings';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { formatMoney } from '../../lib/pricing';

/**
 * Booking page: opened from a service's Book button with ?service_id=.
 * Date + quantity + live availability. Confirm is disabled with a clear
 * reason whenever the booking cannot be placed (full, closed, out of dates).
 */
export default function NewBooking() {
  const { service_id } = useLocalSearchParams<{ service_id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState('1');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { height: WH } = useWindowDimensions();
  const heroH = Math.min(260, Math.max(170, Math.round(WH * 0.27)));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('services').select('*, companies(name_en,name_ar)').eq('id', service_id).maybeSingle();
      setRow(data);
      if (data) {
        const { data: q } = await supabase.rpc('calculate_price_quote', { p_service_id: data.id });
        setQuote(q);
      }
      setLoading(false);
    })();
  }, [service_id]);

  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  const qn = Math.max(0, Number(qty) || 0);
  const max = Number(row.max_booking ?? 0);
  const cur = Number(row.current_booking ?? 0);
  const day = date.trim();

  // Availability gate — mirrors the admin's max-people + date window settings.
  let reason: string | null = null;
  if (!row.available) {
    reason = t('booking.unavailable');
  } else if (qn < 1) {
    reason = t('booking.invalidQty');
  } else if (max > 0 && cur + qn > max) {
    const left = Math.max(0, max - cur);
    reason = t('booking.onlyLeft', { count: left });
  } else if (row.available_from && day < String(row.available_from).slice(0, 10)) {
    reason = t('booking.fromDate', { date: String(row.available_from).slice(0, 10) });
  } else if (row.available_to && day > String(row.available_to).slice(0, 10)) {
    reason = t('booking.untilDate', { date: String(row.available_to).slice(0, 10) });
  }

  const book = async () => {
    if (reason) { setMsg(reason); return; }
    setMsg(null); setBusy(true);
    try {
      const res: any = await createBookingServer({ service_id: service_id!, booking_date: new Date(day).toISOString(), quantity: qn });
      const bookingId = res?.booking_id ?? res?.id ?? res;
      router.push(`/booking/${bookingId}` as any);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => router.back()}
        style={[s.backFab, rtl ? { right: 16 } : { left: 16 }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        {rtl ? <ArrowRight color={COLORS.text} size={20} /> : <ArrowLeft color={COLORS.text} size={20} />}
      </Pressable>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View>
          <Image
            source={row.image_url ? { uri: row.image_url } : fallbackPhoto(row.id)}
            style={[s.hero, { height: heroH }]}
            contentFit="cover"
          />
          <LinearGradient colors={['transparent', 'rgba(43,26,18,0.55)']} style={s.heroShade} />
        </View>
        <View style={s.body}>
          <Text style={s.name}>{name}</Text>
          <Text style={s.muted}>
            {(row.companies as any)?.name_en} · {formatMoney(quote?.final_price ?? row.current_price, row.currency)} · {cur}/{max}
          </Text>
          <View style={{ height: 10 }} />
          <PriceBreakdown quote={quote ?? { base_price: row.base_price, dynamic_price: row.current_price, final_price: row.current_price, currency: row.currency }} />
          <View style={{ height: 14 }} />
          <Field label={t('booking.date')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field label={t('booking.quantity')} value={qty} onChangeText={setQty} keyboardType="numeric" />
          {reason ? (
            <View style={s.why}>
              <Text style={s.whyTxt}>{reason}</Text>
            </View>
          ) : null}
          {msg && msg !== reason ? <Text style={s.err}>{msg}</Text> : null}
          <PrimaryButton title={busy ? '…' : t('booking.confirm')} onPress={book} disabled={busy || !!reason} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  backFab: {
    position: 'absolute', top: 54, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 4,
  },
  hero: { width: '100%', height: 220, backgroundColor: COLORS.softGreen },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  body: { padding: 16, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  muted: { color: COLORS.secondaryText, marginTop: 4 },
  why: { backgroundColor: '#FAF0D7', borderWidth: 1, borderColor: COLORS.gold, borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  whyTxt: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  err: { color: COLORS.error, marginBottom: 8 },
});
