import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { fallbackPhoto } from '../../constants/photos';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { usePrice } from '../../lib/currency';

/**
 * Booking page: opened from a service's Book button with ?service_id=.
 * Date + quantity + coupon, live availability. Confirm goes to the
 * payment page (CARD / PAYPAL) — booking completes there.
 */
export default function NewBooking() {
  const { colors: C } = useTheme();
  const { service_id, date: d0, qty: q0 } = useLocalSearchParams<{ service_id: string; date?: string; qty?: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(typeof d0 === 'string' && d0 ? d0 : new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState(typeof q0 === 'string' && q0 ? q0 : '1');
  const [msg, setMsg] = useState<string | null>(null);
  const [coupon, setCoupon] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [myCoupons, setMyCoupons] = useState<any[]>([]);
  const { fmt } = usePrice();
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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: cp } = await supabase
            .from('coupons')
            .select('code,kind,value')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(20);
          setMyCoupons(cp ?? []);
        }
      } catch {
        // coupons optional — manual code still works
      }
      setLoading(false);
    })();
  }, [service_id]);

  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  const qn = Math.max(0, Number(qty) || 0);
  const max = Number(row.max_booking ?? 0);
  const cur = Number(row.current_booking ?? 0);
  const day = date.trim();

  // Availability gate — overbooking past max is allowed (price rises instead).
  let reason: string | null = null;
  if (!row.available) {
    reason = t('booking.unavailable');
  } else if (qn < 1) {
    reason = t('booking.invalidQty');
  } else if (row.available_from && day < String(row.available_from).slice(0, 10)) {
    reason = t('booking.fromDate', { date: String(row.available_from).slice(0, 10) });
  } else if (row.available_to && day > String(row.available_to).slice(0, 10)) {
    reason = t('booking.untilDate', { date: String(row.available_to).slice(0, 10) });
  }

  const effectiveCoupon = (picked ?? coupon.trim()).toUpperCase();

  // Live estimate for the picked coupon (server applies it authoritatively).
  // Quote is per-person: scale to the full total so coupons work for any quantity.
  const pickedCpn = myCoupons.find((c) => c.code === picked);
  const unit = Number(quote?.final_price ?? row.current_price ?? 0);
  const pickBase = Math.round(unit * qn * 100) / 100;
  const pickOff = pickedCpn
    ? pickedCpn.kind === 'percent'
      ? Math.round(pickBase * Math.min(Number(pickedCpn.value), 100)) / 100
      : Math.min(Number(pickedCpn.value), pickBase)
    : 0;

  const goPay = () => {
    if (reason) { setMsg(reason); return; }
    setMsg(null);
    router.push(
      `/booking/pay?service_id=${service_id}&date=${encodeURIComponent(day)}&qty=${qn}&coupon=${encodeURIComponent(effectiveCoupon)}` as any
    );
  };

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => router.back()}
        style={[s.backFab, rtl ? { right: 16 } : { left: 16 }]}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        {rtl ? <ArrowRight color={C.text} size={20} /> : <ArrowLeft color={C.text} size={20} />}
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
            {(row.companies as any)?.name_en} · {fmt(quote?.final_price ?? row.current_price, row.currency)} · {cur}/{max}
          </Text>
          <View style={{ height: 10 }} />
          <PriceBreakdown quote={quote ?? { base_price: row.base_price, dynamic_price: row.current_price, final_price: row.current_price, currency: row.currency }} />
          <View style={{ height: 14 }} />
          <Field label={t('booking.date')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field label={t('booking.quantity')} value={qty} onChangeText={setQty} keyboardType="numeric" />
          {myCoupons.length > 0 ? (
            <>
              <Text style={s.secLabel}>{t('booking.chooseCoupon')}</Text>
              <View style={s.couponRow}>
                {myCoupons.map((c) => {
                  const on = picked === c.code;
                  return (
                    <Pressable
                      key={c.code}
                      onPress={() => { setPicked(on ? null : c.code); setCoupon(''); setMsg(null); }}
                      style={[s.coupon, on && s.couponOn]}
                      accessibilityRole="button"
                      accessibilityLabel={c.code}
                    >
                      <Text style={[s.couponCode, on && s.couponCodeOn]}>{c.code}</Text>
                      <Text style={[s.couponVal, on && s.couponCodeOn]}>
                        {c.kind === 'percent' ? `${c.value}%` : c.value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {pickOff > 0 ? (
                <Text style={s.couponOff}>−{fmt(pickOff, row.currency)} → {fmt(Math.max(pickBase - pickOff, 0), row.currency)}</Text>
              ) : null}
            </>
          ) : null}
          <Field label={t('store.couponLabel')} value={coupon} onChangeText={(v) => { setCoupon(v.toUpperCase()); setPicked(null); }} placeholder="EARTH-XXXX-XXX-XXX" autoCapitalize="characters" />
          <Text style={s.muted}>{t('store.couponHint')}</Text>
          {reason ? (
            <View style={s.why}>
              <Text style={s.whyTxt}>{reason}</Text>
            </View>
          ) : null}
          {msg && msg !== reason ? <Text style={s.err}>{msg}</Text> : null}
          {qn > 0 ? (
            <View style={s.totalBox}>
              <Text style={s.totalLine}>{t('sheet.total')}: {qn} × {fmt(unit, row.currency)} = {fmt(unit * qn, row.currency)}</Text>
              {pickOff > 0 ? (
                <Text style={s.totalAfter}>−{fmt(pickOff, row.currency)} → {fmt(Math.max(unit * qn - pickOff, 0), row.currency)}</Text>
              ) : null}
            </View>
          ) : null}
          <PrimaryButton title={t('booking.confirm')} onPress={goPay} disabled={!!reason} />
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  backFab: {
    position: 'absolute', top: 54, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 4,
  },
  hero: { width: '100%', height: 220, backgroundColor: C.softGreen },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  body: { padding: 16, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: C.card },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  muted: { color: C.secondaryText, marginTop: 4 },
  secLabel: { fontSize: 13, color: C.secondaryText, marginBottom: 6, fontWeight: '600' },
  couponRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  coupon: { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, alignItems: 'center' },
  couponOn: { borderColor: C.primary, backgroundColor: C.softGreen },
  couponCode: { fontWeight: '800', color: C.text, fontSize: 13, letterSpacing: 0.5 },
  couponCodeOn: { color: C.primaryDark },
  couponVal: { fontWeight: '700', color: C.secondaryText, fontSize: 12 },
  couponOff: { fontSize: 15, fontWeight: '800', color: C.success, marginBottom: 12 },
  why: { backgroundColor: '#FAF0D7', borderWidth: 1, borderColor: C.gold, borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  whyTxt: { color: C.text, fontWeight: '600', fontSize: 14 },
  err: { color: C.error, marginBottom: 8 },
  totalBox: { backgroundColor: C.softGreen, borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  totalLine: { fontSize: 16, fontWeight: '800', color: C.text },
  totalAfter: { fontSize: 15, fontWeight: '800', color: C.success, marginTop: 4 },
});
