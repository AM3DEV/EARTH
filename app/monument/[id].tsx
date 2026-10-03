import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking, Share, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import MapView, { Marker } from '../../components/maps/NativeMap';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { fallbackPhoto } from '../../constants/photos';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Stars, Badge } from '../../components/ui/Card';
import { PhotoSlider } from '../../components/cards/Cards';
import { ReviewsSection } from '../../components/reviews/ReviewsSection';
import { useFavorites } from '../../hooks/useFavorites';

function useRow(table: string, id?: string) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        setRow(data);
      } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [id, table]);
  return { row, loading, error };
}

export function DetailShell({ table, targetType, backTo }: { table: string; targetType: string; backTo?: string }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { row, loading, error } = useRow(table, id);
  const { rows: favs, toggle } = useFavorites();
  const rtl = lang === 'ar';
  // Responsive slider: ~32% of screen height, clamped for small and large screens.
  const { height: WH } = useWindowDimensions();
  const heroH = Math.min(340, Math.max(200, Math.round(WH * 0.32)));

  if (loading) return <LoadingState />;
  if (error || !row) return <ErrorState message={error ?? t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? (row.name_ar ?? row.title_ar) : (row.name_en ?? row.title_en);
  const desc = lang === 'ar' ? (row.description_ar ?? '') : (row.description_en ?? '');
  const heroPics = [row.image_url ?? row.cover_url, ...(row.gallery_urls ?? [])].filter(Boolean);
  const isFav = (favs ?? []).some((f: any) => f.target_type === targetType && f.target_id === row.id);

  const openDirs = () => {
    if (row.lat && row.lng) Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}`);
  };

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => (backTo ? router.push(backTo as any) : router.back())}
        style={[s.backFab, rtl ? { right: 16 } : { left: 16 }]}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        {rtl ? <ArrowRight color={COLORS.text} size={20} /> : <ArrowLeft color={COLORS.text} size={20} />}
      </Pressable>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 110, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <PhotoSlider urls={heroPics.length > 0 ? heroPics : [fallbackPhoto(row.id ?? targetType)]} height={heroH} />
        </View>
        <View style={s.body}>
          <Text style={s.name}>{name}</Text>
          {row.avg_rating ?? row.rating ? <Stars value={row.avg_rating ?? row.rating} /> : <Text style={s.muted}>{t('map.noReviews')}</Text>}
          {desc ? <Text style={s.desc}>{desc}</Text> : null}
          <View style={s.grid}>
            {row.location ? <Info k="📍" v={row.location} /> : null}
            {row.opening_hours ? <Info k="🕒" v={row.opening_hours} /> : null}
            {row.price != null ? <Info k="💰" v={`${row.price} ${row.currency ?? ''}`} /> : <Info k="💰" v={t('detail.priceUnavailable')} />}
            {row.phone ? <Info k="📞" v={row.phone} /> : null}
            {row.website ? <Info k="🌐" v={row.website} /> : null}
          </View>
          {row.lat && row.lng ? (
            <MapView style={s.miniMap} initialRegion={{ latitude: row.lat, longitude: row.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }} scrollEnabled={false}>
              <Marker coordinate={{ latitude: row.lat, longitude: row.lng }} />
            </MapView>
          ) : null}
          <View style={s.actions}>
            <Pressable style={({ pressed }) => [s.btn, pressed && s.pressed]} onPress={openDirs}><Text style={s.btnT}>{t('detail.directions')}</Text></Pressable>
            <Pressable
              style={({ pressed }) => [s.btnO, isFav && s.btnFavOn, pressed && s.pressed]}
              onPress={() => toggle(targetType, row.id)}
            >
              <Text style={[s.btnOTxt, isFav && s.favTxt]}>{isFav ? `♥ ${t('detail.favorite')}` : `♡ ${t('detail.favorite')}`}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.btnO, pressed && s.pressed]} onPress={() => Share.share({ message: name })}>
              <Text style={s.btnOTxt}>{t('detail.share')}</Text>
            </Pressable>
          </View>
          {table === 'companies' ? (
            <Pressable style={s.bookCta} onPress={() => router.push(`/company/${row.id}` as any)}>
              <Text style={s.btnT}>{t('detail.book')}</Text>
            </Pressable>
          ) : null}
          <ReviewsSection targetType={targetType} targetId={id!} />
        </View>
      </ScrollView>
    </View>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.info}><Text style={s.infoK}>{k}</Text><Text style={s.infoV}>{v}</Text></View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  // Floating back button: always above the hero (zIndex + elevation).
  backFab: {
    position: 'absolute', top: 54, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 4,
  },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  muted: { color: COLORS.secondaryText, marginTop: 4 },
  desc: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginTop: 12 },
  grid: { marginTop: 14, gap: 8 },
  info: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10 },
  infoK: { fontSize: 15 },
  infoV: { flex: 1, color: COLORS.text, fontSize: 14 },
  miniMap: { height: 180, borderRadius: RADIUS.lg, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: '#fff', fontWeight: '700' },
  btnO: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  btnOTxt: { fontWeight: '700', color: COLORS.primaryDark, fontSize: 14 },
  btnFavOn: { backgroundColor: '#FDE7E9', borderColor: COLORS.error },
  favTxt: { color: COLORS.error, fontWeight: '800' },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  bookCta: { backgroundColor: COLORS.text, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
});

export default function MonumentDetail() {
  return <DetailShell table="monuments" targetType="monument" />;
}
