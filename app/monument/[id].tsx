import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Stars, Badge } from '../../components/ui/Card';
import { useFavorites, useReviews } from '../../hooks/useFavorites';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';

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
  const { toggle } = useFavorites();
  const { rows: reviews, add } = useReviews(targetType, id);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);

  if (loading) return <LoadingState />;
  if (error || !row) return <ErrorState message={error ?? t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? (row.name_ar ?? row.title_ar) : (row.name_en ?? row.title_en);
  const desc = lang === 'ar' ? (row.description_ar ?? '') : (row.description_en ?? '');
  const img = row.image_url ?? row.cover_url;

  const openDirs = () => {
    if (row.lat && row.lng) Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}`);
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      {img ? (
        <Image source={{ uri: img }} style={s.hero} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[s.hero, s.heroFallback]}>
          <Text style={s.heroEmoji}>🇯🇴</Text>
          <Text style={s.heroTxt}>{name}</Text>
        </View>
      )}
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
          <Pressable style={s.btn} onPress={openDirs}><Text style={s.btnT}>{t('detail.directions')}</Text></Pressable>
          <Pressable style={s.btnO} onPress={() => toggle(targetType, row.id)}><Text>{t('detail.favorite')}</Text></Pressable>
          <Pressable style={s.btnO} onPress={() => Share.share({ message: name })}><Text>{t('detail.share')}</Text></Pressable>
        </View>
        {table === 'companies' ? (
          <Pressable style={s.bookCta} onPress={() => router.push(`/company/${row.id}` as any)}>
            <Text style={s.btnT}>{t('detail.book')}</Text>
          </Pressable>
        ) : null}
        <Text style={s.secTitle}>{t('detail.reviews')} ({reviews.length})</Text>
        {reviews.map((r: any) => (
          <View key={r.id} style={s.rev}>
            <Stars value={r.rating} />
            {r.comment ? <Text style={s.revTxt}>{r.comment}</Text> : null}
          </View>
        ))}
        <View style={s.addRev}>
          <Field label="Rating (1-5)" value={String(rating)} onChangeText={(v) => setRating(Math.min(5, Math.max(1, Number(v) || 1)))} keyboardType="numeric" />
          <Field label="Comment" value={comment} onChangeText={setComment} multiline />
          <PrimaryButton title={t('common.save')} onPress={() => { add(rating, comment); setComment(''); }} />
        </View>
      </View>
    </ScrollView>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.info}><Text style={s.infoK}>{k}</Text><Text style={s.infoV}>{v}</Text></View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  hero: { width: '100%', height: 260, backgroundColor: '#eee' },
  heroFallback: { backgroundColor: '#F3D9CC', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 56 },
  heroTxt: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  muted: { color: COLORS.secondaryText, marginTop: 4 },
  desc: { color: COLORS.text, fontSize: 15, lineHeight: 22, marginTop: 12 },
  grid: { marginTop: 14, gap: 8 },
  info: { flexDirection: 'row', gap: 8, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10 },
  infoK: { fontSize: 15 },
  infoV: { flex: 1, color: COLORS.text, fontSize: 14 },
  miniMap: { height: 180, borderRadius: RADIUS.lg, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: '#fff', fontWeight: '700' },
  btnO: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  bookCta: { backgroundColor: COLORS.text, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 20, marginBottom: 8 },
  rev: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10, marginBottom: 8 },
  revTxt: { marginTop: 4, color: COLORS.text },
  addRev: { marginTop: 12 },
});

export default function MonumentDetail() {
  return <DetailShell table="monuments" targetType="monument" />;
}
