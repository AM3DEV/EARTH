import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking, Share, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import MapView, { Marker } from '../../components/maps/NativeMap';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { fallbackPhoto } from '../../constants/photos';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Stars } from '../../components/ui/Card';
import { PhotoSlider } from '../../components/cards/Cards';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { usePrice } from '../../lib/currency';
import { ReviewsSection } from '../../components/reviews/ReviewsSection';
import { useFavorites } from '../../hooks/useFavorites';

export default function CompanyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { rows: favs, toggle } = useFavorites();
  // Responsive slider: ~28% of screen height, clamped for small and large screens.
  const { height: WH } = useWindowDimensions();
  const coverH = Math.min(300, Math.max(170, Math.round(WH * 0.28)));
  const { fmt } = usePrice();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
    setRow(data);
    if (data) {
      // All services, bookable first — tapping a company always shows everything.
      const { data: sv } = await supabase.from('services').select('*').eq('company_id', data.id).order('available', { ascending: false });
      setServices(sv ?? []);
    }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  // Refresh on return (new review updates the header rating via trigger).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  const desc = lang === 'ar' ? row.description_ar : row.description_en;
  const isFav = (favs ?? []).some((f: any) => f.target_type === 'company' && f.target_id === row.id);
  // Centered slider pictures: cover first, then gallery.
  const pics = [row.cover_url, ...(row.gallery_urls ?? [])].filter(Boolean);

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
          <PhotoSlider urls={pics.length > 0 ? pics : [fallbackPhoto(row.id)]} height={coverH} />
        </View>
        <View style={s.body}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <View style={s.nameRow}>
                <Text style={s.name} numberOfLines={2}>{name}</Text>
                {row.verified ? <VerifiedBadge /> : null}
              </View>
              {row.avg_rating ?? row.rating ? <Stars value={row.avg_rating ?? row.rating} /> : <Text style={s.muted}>{t('map.noReviews')}</Text>}
              {row.location ? <Text style={s.muted}>{row.location}</Text> : null}
            </View>
          </View>
          {desc ? <Text style={s.desc}>{desc}</Text> : null}
          <View style={s.actions}>
            {row.phone ? <Pressable style={({ pressed }) => [s.btnO, pressed && s.pressed]} onPress={() => Linking.openURL(`tel:${row.phone}`)}><Text style={s.btnOTxt}>{t('detail.call')}</Text></Pressable> : null}
            {row.website ? <Pressable style={({ pressed }) => [s.btnO, pressed && s.pressed]} onPress={() => Linking.openURL(row.website)}><Text style={s.btnOTxt}>{t('detail.website')}</Text></Pressable> : null}
            <Pressable
              style={({ pressed }) => [s.btnO, isFav && s.btnFavOn, pressed && s.pressed]}
              onPress={() => toggle('company', row.id)}
            >
              <Text style={[s.btnOTxt, isFav && s.favTxt]}>{isFav ? `♥ ${t('detail.favorite')}` : `♡ ${t('detail.favorite')}`}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.btnO, pressed && s.pressed]} onPress={() => Share.share({ message: name })}>
              <Text style={s.btnOTxt}>{t('detail.share')}</Text>
            </Pressable>
          </View>
          {row.lat && row.lng ? (
            <>
              <MapView style={s.map} initialRegion={{ latitude: row.lat, longitude: row.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }} scrollEnabled={false}>
                <Marker coordinate={{ latitude: row.lat, longitude: row.lng }} />
              </MapView>
              <Pressable style={s.btn} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}`)}>
                <Text style={s.btnT}>{t('detail.directions')}</Text>
              </Pressable>
            </>
          ) : null}
          <Text style={s.sec}>{t('detail.services')}</Text>
          {services.map((sv) => {
            const sn = lang === 'ar' ? sv.name_ar : sv.name_en;
            const off = !sv.available;
            const inner = (
              <>
                <View style={s.svTop}>
                  <Text style={s.svName}>{sn}</Text>
                  {off ? (
                    <Text style={s.off}>{t('common.inactive')}</Text>
                  ) : (
                    <Text style={s.book}>{t('detail.book')} ›</Text>
                  )}
                </View>
                <Text style={s.muted}>{fmt(sv.current_price, sv.currency)} · {sv.current_booking}/{sv.max_booking}</Text>
              </>
            );
            return off ? (
              <View key={sv.id} style={[s.sv, s.svOff]}>{inner}</View>
            ) : (
              <Pressable key={sv.id} style={s.sv} onPress={() => router.push(`/service/${sv.id}` as any)} accessibilityRole="button" accessibilityLabel={sn}>
                {inner}
              </Pressable>
            );
          })}
          {services.length === 0 ? <Text style={s.muted}>{t('detail.noServices')}</Text> : null}
          <ReviewsSection targetType="company" targetId={row.id} />
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
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { flexShrink: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
  desc: { marginTop: 12, fontSize: 15, lineHeight: 22, color: COLORS.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  btnO: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  btnOTxt: { fontWeight: '700', color: COLORS.primaryDark, fontSize: 14 },
  btnFavOn: { backgroundColor: '#FDE7E9', borderColor: COLORS.error },
  favTxt: { color: COLORS.error, fontWeight: '800' },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnT: { color: '#fff', fontWeight: '700' },
  map: { height: 180, borderRadius: RADIUS.lg, marginTop: 14 },
  sec: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  sv: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, backgroundColor: COLORS.card },
  svOff: { opacity: 0.6 },
  off: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
  svTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  svName: { flex: 1, fontWeight: '700', color: COLORS.text, fontSize: 15 },
  book: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 14 },
});
