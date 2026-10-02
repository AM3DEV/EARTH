import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useCategories, useMonuments } from '../../hooks/useMonuments';
import { useEvents } from '../../hooks/useEvents';
import { useCompanies } from '../../hooks/useCompanies';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { GenericCard } from '../../components/cards/Cards';
import { COLORS, RADIUS } from '../../constants/colors';

const NEAR_KM = 25;

export default function MonumentTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { rows: cats } = useCategories();
  const [cat, setCat] = useState<string | undefined>(undefined);

  // Dedupe chips by name (case-insensitive): "Activities" + "activities" = ONE chip.
  const norm = (s: any) => String(s ?? '').trim().toLowerCase();
  const uniqCats = cats.filter((c: any, i: number, a: any[]) => a.findIndex((x: any) => norm(x.name_en) === norm(c.name_en)) === i);
  const selected = cats.find((c: any) => c.id === cat);
  // Selecting a chip matches ALL same-named category rows.
  const catIds = selected ? cats.filter((c: any) => norm(c.name_en) === norm(selected.name_en)).map((c: any) => c.id) : undefined;
  const { rows, loading, error, reload } = useMonuments(catIds);
  const { rows: events } = useEvents(catIds);
  const { rows: comps } = useCompanies(undefined, catIds);
  const { rows: allComps } = useCompanies(undefined, undefined);

  // "Near Event": companies around the tourist, nearest first (25 km).
  const [nearby, setNearby] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  const kmBetween = (a: number, b: number, c: number, d: number) => {
    const R = 6371;
    const t = (x: number) => (x * Math.PI) / 180;
    const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const enableNearby = async () => {
    setLocErr(null);
    if (userLoc) {
      setCat(undefined);
      setNearby(true);
      return;
    }
    setLocBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error(lang === 'ar' ? 'تم رفض إذن الموقع' : 'Location permission denied');
      const pos = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setCat(undefined);
      setNearby(true);
    } catch (e: any) {
      setLocErr(e.message);
    } finally {
      setLocBusy(false);
    }
  };

  const pickCat = (id: string | undefined) => {
    setCat(id);
    setNearby(false);
  };

  // Cross-kind merge: same-named place shown once (monument > event > company).
  const kindRank: Record<string, number> = { m: 0, e: 1, c: 2 };
  const normTitle = (r: any) =>
    String(lang === 'ar' ? (r.name_ar ?? r.title_ar) : (r.name_en ?? r.title_en) ?? '').trim().toLowerCase();
  const byName = new Map<string, any>();
  for (const it of [
    ...rows.map((r: any) => ({ kind: 'm', r })),
    ...events.map((r: any) => ({ kind: 'e', r })),
    ...comps.map((r: any) => ({ kind: 'c', r })),
  ]) {
    const n = normTitle(it.r);
    const cur = byName.get(n);
    if (!cur || kindRank[it.kind] < kindRank[cur.kind]) byName.set(n, it);
  }
  const merged = [...byName.values()];

  // Nearby mode: companies within radius, nearest first, with distance.
  let listData = merged;
  if (nearby && userLoc) {
    listData = allComps
      .filter((r: any) => r.lat != null && r.lng != null)
      .map((r: any) => ({
        kind: 'c',
        r,
        dist: kmBetween(userLoc.lat, userLoc.lng, r.lat, r.lng),
      }))
      .filter((it: any) => it.dist <= NEAR_KM)
      .sort((a: any, b: any) => a.dist - b.dist);
  }

  const isEmpty = nearby ? userLoc != null && listData.length === 0 : rows.length === 0 && events.length === 0 && comps.length === 0;

  return (
    <View style={s.wrap}>
      <View style={s.topBar}>
        <Text style={s.title}>{t('monument.title')}</Text>
        <Pressable
          onPress={() => (nearby ? (setNearby(false), setCat(undefined)) : enableNearby())}
          disabled={locBusy}
          style={[s.nearBtn, nearby && s.nearBtnActive]}
          accessibilityRole="button"
          accessibilityLabel={t('monument.nearEvent')}
        >
          <MapPin color={nearby ? '#fff' : COLORS.primaryDark} size={16} />
          <Text style={[s.nearTxt, nearby && s.nearTxtActive]}>
            {locBusy ? '…' : t('monument.nearEvent')}
          </Text>
        </Pressable>
        {locErr ? <Text style={s.locErr}>{locErr}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          <Pressable onPress={() => pickCat(undefined)} style={[s.chip, !cat && !nearby && s.chipActive]}>
            <Text style={[s.chipTxt, !cat && !nearby && s.chipTxtActive]}>{t('monument.all')}</Text>
          </Pressable>
          {uniqCats.map((c) => {
            const active = !!selected && !nearby && norm(c.name_en) === norm(selected.name_en);
            return (
              <Pressable key={c.id} onPress={() => pickCat(c.id)} style={[s.chip, active && s.chipActive]}>
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{lang === 'ar' ? c.name_ar : c.name_en}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={reload} /> : nearby && !userLoc ? <LoadingState /> : isEmpty ? <EmptyState /> : (
        <FlatList
          data={listData}
          keyExtractor={(it: any) => `${it.kind}-${it.r.id}`}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: any) => {
            const r = item.r;
            const title = lang === 'ar' ? (r.name_ar ?? r.title_ar) : (r.name_en ?? r.title_en);
            if (item.kind === 'm') {
              return <GenericCard image={r.image_url} title={title} subtitle={r.location} meta={r.price ? `${r.price} ${r.currency ?? ''}` : t('detail.priceUnavailable')} onPress={() => router.push(`/monument/${r.id}` as any)} />;
            }
            if (item.kind === 'e') {
              return <GenericCard image={r.image_url} title={title} subtitle={r.location} meta={r.start_at?.slice(0, 10)} onPress={() => router.push(`/event/${r.id}` as any)} />;
            }
            const distTxt = item.dist != null ? `${item.dist.toFixed(1)} km · ` : '';
            return <GenericCard image={r.cover_url ?? r.logo_url} title={title} subtitle={r.location} meta={`${distTxt}${t('admin.companies')}`} verified={!!r.verified} onPress={() => router.push(`/company/${r.id}` as any)} />;
          }}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  // Solid upper bar: opaque background + elevation so card images can never
  // paint over the title and filter buttons.
  topBar: {
    paddingTop: 56, paddingBottom: 10, backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderColor: COLORS.border, zIndex: 10, elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  nearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 16, minHeight: 44, backgroundColor: COLORS.card,
  },
  nearBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  nearTxt: { fontWeight: '800', color: COLORS.primaryDark, fontSize: 14 },
  nearTxtActive: { color: '#fff' },
  locErr: { color: COLORS.error, fontSize: 12, paddingHorizontal: 16, marginTop: 6 },
  chips: { height: 48, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, height: 36, justifyContent: 'center', backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipTxt: { color: COLORS.text, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
});
