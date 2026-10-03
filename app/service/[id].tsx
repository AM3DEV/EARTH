import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { fallbackPhoto } from '../../constants/photos';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { Badge } from '../../components/ui/Card';
import { PhotoSlider } from '../../components/cards/Cards';
import { ReviewsSection } from '../../components/reviews/ReviewsSection';
import { PrimaryButton } from '../../components/ui/Buttons';

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Responsive slider: ~30% of screen height, clamped for small and large screens.
  const { height: WH } = useWindowDimensions();
  const heroH = Math.min(320, Math.max(180, Math.round(WH * 0.3)));

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

  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  const heroPics = [row.image_url, ...(row.gallery_urls ?? [])].filter(Boolean);
  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => router.back()}
        style={[s.backFab, rtl ? { right: 16 } : { left: 16 }]}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        {rtl ? <ArrowRight color={COLORS.text} size={20} /> : <ArrowLeft color={COLORS.text} size={20} />}
      </Pressable>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 110, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <PhotoSlider urls={heroPics.length > 0 ? heroPics : [fallbackPhoto(row.id)]} height={heroH} />
        </View>
        <View style={s.body}>
          <Text style={s.name}>{name}</Text>
          <Text style={s.muted}>{(row.companies as any)?.name_en} · {row.current_booking}/{row.max_booking}</Text>
          {(quote?.support_discount_percentage ?? 0) > 0 ? <Badge label={t('support.badge', { pct: quote.support_discount_percentage })} tone="success" /> : null}
          <View style={{ height: 10 }} />
          <PriceBreakdown quote={quote ?? { base_price: row.base_price, dynamic_price: row.current_price, final_price: row.current_price, currency: row.currency }} />
          <View style={{ height: 14 }} />
          <PrimaryButton title={t('detail.book')} onPress={() => router.push(`/booking/new?service_id=${row.id}` as any)} />
          <ReviewsSection targetType="service" targetId={row.id} />
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
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  muted: { color: COLORS.secondaryText, marginTop: 4 },
});
