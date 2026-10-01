import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking, Share, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import MapView, { Marker } from '../../components/maps/NativeMap';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Stars } from '../../components/ui/Card';
import { useFavorites } from '../../hooks/useFavorites';

export default function CompanyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const [row, setRow] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggle } = useFavorites();
  // Responsive cover: ~28% of screen height, clamped for small and large screens.
  const { height: WH } = useWindowDimensions();
  const coverH = Math.min(300, Math.max(170, Math.round(WH * 0.28)));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
      setRow(data);
      if (data) {
        const { data: sv } = await supabase.from('services').select('*').eq('company_id', data.id).eq('available', true);
        setServices(sv ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  const desc = lang === 'ar' ? row.description_ar : row.description_en;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      {row.cover_url ? <Image source={{ uri: row.cover_url }} style={[s.cover, { height: coverH }]} contentFit="cover" /> : null}
      <View style={s.body}>
        <View style={s.head}>
          {row.logo_url ? <Image source={{ uri: row.logo_url }} style={s.logo} contentFit="cover" /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{name}</Text>
            {row.avg_rating ?? row.rating ? <Stars value={row.avg_rating ?? row.rating} /> : <Text style={s.muted}>{t('map.noReviews')}</Text>}
            {row.location ? <Text style={s.muted}>{row.location}</Text> : null}
          </View>
        </View>
        {desc ? <Text style={s.desc}>{desc}</Text> : null}
        <View style={s.actions}>
          {row.phone ? <Pressable style={s.btnO} onPress={() => Linking.openURL(`tel:${row.phone}`)}><Text>{t('detail.call')}</Text></Pressable> : null}
          {row.website ? <Pressable style={s.btnO} onPress={() => Linking.openURL(row.website)}><Text>{t('detail.website')}</Text></Pressable> : null}
          <Pressable style={s.btnO} onPress={() => toggle('company', row.id)}><Text>{t('detail.favorite')}</Text></Pressable>
          <Pressable style={s.btnO} onPress={() => Share.share({ message: name })}><Text>{t('detail.share')}</Text></Pressable>
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
        <Text style={s.sec}>Services</Text>
        {services.map((sv) => {
          const sn = lang === 'ar' ? sv.name_ar : sv.name_en;
          return (
            <Pressable key={sv.id} style={s.sv} onPress={() => router.push(`/service/${sv.id}` as any)} accessibilityRole="button" accessibilityLabel={sn}>
              <View style={s.svTop}>
                <Text style={s.svName}>{sn}</Text>
                <Text style={s.book}>{t('detail.book')} ›</Text>
              </View>
              <Text style={s.muted}>{sv.current_price} {sv.currency} · {sv.current_booking}/{sv.max_booking}</Text>
            </Pressable>
          );
        })}
        {services.length === 0 ? <Text style={s.muted}>No services yet.</Text> : null}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  cover: { width: '100%', height: 200, backgroundColor: '#eee' },
  body: { padding: 16 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#eee', borderWidth: 1, borderColor: COLORS.border },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
  desc: { marginTop: 12, fontSize: 15, lineHeight: 22, color: COLORS.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  btnO: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnT: { color: '#fff', fontWeight: '700' },
  map: { height: 180, borderRadius: RADIUS.lg, marginTop: 14 },
  sec: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  sv: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8 },
  svTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  svName: { flex: 1, fontWeight: '700', color: COLORS.text, fontSize: 15 },
  book: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 14 },
});
