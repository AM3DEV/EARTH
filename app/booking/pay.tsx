import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CreditCard, Wallet } from 'lucide-react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { RADIUS, SHADOW } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { createBookingServer } from '../../hooks/useBookings';
import { usePrice } from '../../lib/currency';

/**
 * Payment page (TEST MODE): CARD / PAYPAL buttons book immediately —
 * no real charge. Receives ?service_id=&date=&qty=&coupon=.
 */
export default function BookingPay() {
  const { colors: C } = useTheme();
  const { service_id, date, qty, coupon } = useLocalSearchParams<{
    service_id: string; date: string; qty: string; coupon?: string;
  }>();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const lang = i18n.language;
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cpn, setCpn] = useState<any>(null);
  const { fmt } = usePrice();

  const qn = Math.max(1, Number(qty) || 1);
  const code = String(coupon ?? '').toUpperCase();

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

  // Estimate the coupon saving up-front (server applies it authoritatively).
  // NOTE: all hooks stay above the early returns (Rules of Hooks).
  useEffect(() => {
    (async () => {
      setCpn(null);
      if (!code) return;
      try {
        const { data } = await supabase.from('coupons').select('kind,value,status').eq('code', code).maybeSingle();
        if (data && data.status === 'active') setCpn(data);
      } catch {
        // invalid code surfaces at payment time
      }
    })();
  }, [code]);

  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;

  // Totals scale with quantity: quote is per-person, total = unit × people.
  // Server computes the same (per_unit × qty, coupon off the total).
  const unitPrice = Number(quote?.final_price ?? row.current_price ?? 0);
  const baseTotal = Math.round(unitPrice * qn * 100) / 100;
  const estOff = cpn
    ? cpn.kind === 'percent'
      ? Math.round(baseTotal * Math.min(Number(cpn.value), 100)) / 100
      : Math.min(Number(cpn.value), baseTotal)
    : 0;

  const pay = async (method: string) => {
    setMsg(null); setBusy(method);
    try {
      const res: any = await createBookingServer({
        service_id: service_id!,
        booking_date: new Date(String(date)).toISOString(),
        quantity: qn,
        couponCode: code || undefined,
      });
      const bookingId = res?.booking_id ?? res?.id ?? res;
      router.push(`/booking/${bookingId}` as any);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 40 }}>
      <View style={[s.head, rtl && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowRight color={C.text} size={20} /> : <ArrowLeft color={C.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('booking.payTitle')}</Text>
      </View>

      <View style={s.summary}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        <Text style={s.muted}>{String(date).slice(0, 10)} · {fmt(unitPrice, row.currency)} × {qn}</Text>
        {code ? <Text style={s.coupon}>{code}</Text> : null}
        {estOff > 0 ? (
          <>
            <Text style={s.wasTotal}>{fmt(quote?.final_price ?? row.current_price, row.currency)}</Text>
            <Text style={s.total}>{fmt(Math.max(baseTotal - estOff, 0), row.currency)}</Text>
            <Text style={s.couponOff}>−{fmt(estOff, row.currency)} {code}</Text>
          </>
        ) : (
          <Text style={s.total}>{fmt(quote?.final_price ?? row.current_price, row.currency)}</Text>
        )}
      </View>

      <Text style={s.test}>{t('booking.payTest')}</Text>

      <Pressable
        onPress={() => pay('card')}
        disabled={busy !== null}
        style={({ pressed }) => [s.method, pressed && s.pressed, busy === 'card' && s.methodBusy]}
        accessibilityRole="button"
        accessibilityLabel={t('booking.payCard')}
      >
        <CreditCard color={C.primaryDark} size={26} />
        <Text style={s.methodTxt}>{busy === 'card' ? '…' : t('booking.payCard')}</Text>
      </Pressable>

      <Pressable
        onPress={() => pay('paypal')}
        disabled={busy !== null}
        style={({ pressed }) => [s.method, pressed && s.pressed, busy === 'paypal' && s.methodBusy]}
        accessibilityRole="button"
        accessibilityLabel={t('booking.payPal')}
      >
        <Wallet color={C.primaryDark} size={26} />
        <Text style={s.methodTxt}>{busy === 'paypal' ? '…' : t('booking.payPal')}</Text>
      </Pressable>

      {msg ? <Text style={s.err}>{msg}</Text> : null}
    </ScrollView>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: C.text },
  summary: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, padding: 16, ...SHADOW.card },
  name: { fontSize: 17, fontWeight: '800', color: C.text },
  muted: { color: C.secondaryText, fontSize: 13, marginTop: 4 },
  coupon: { marginTop: 6, fontWeight: '800', letterSpacing: 1, color: C.primaryDark },
  total: { fontSize: 26, fontWeight: '800', color: C.text, marginTop: 10 },
  wasTotal: { fontSize: 17, fontWeight: '600', color: C.muted, marginTop: 10, textDecorationLine: 'line-through' },
  couponOff: { fontSize: 16, fontWeight: '800', color: C.success, marginTop: 4 },
  test: { color: C.secondaryText, fontSize: 13, textAlign: 'center', marginVertical: 16, fontStyle: 'italic' },
  method: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.lg, padding: 18, marginBottom: 12, ...SHADOW.card,
  },
  methodBusy: { opacity: 0.6 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  methodTxt: { fontSize: 18, fontWeight: '800', color: C.text },
  err: { color: C.error, marginTop: 8, textAlign: 'center', fontWeight: '600' },
});
