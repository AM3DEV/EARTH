import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, TextInput, useWindowDimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin, ScanLine, ArrowLeft, ArrowRight, Search, X,
  LayoutGrid, Landmark, Ticket, Building2, Map as MapIcon,
} from 'lucide-react-native';
import { useCategories, useMonuments } from '../../hooks/useMonuments';
import { useEvents } from '../../hooks/useEvents';
import { useCompanies } from '../../hooks/useCompanies';
import { useFavorites } from '../../hooks/useFavorites';
import { searchPlaces } from '../../lib/search';
import { supabase } from '../../lib/supabase';
import { usePrice } from '../../lib/currency';
import { ErrorState } from '../../components/ui/States';
import { ActivityCard, ActivityKind } from '../../components/cards/ActivityCard';
import { COLORS, RADIUS } from '../../constants/colors';
import { PHOTOS } from '../../constants/photos';
import { GOVERNORATES, detectGovernorate } from '../../constants/governorates';
import { ScreenPal, useTheme } from '../../lib/theme';
import * as Location from 'expo-location';

const typeIcon = (type?: string | null) =>
  type === 'monument' ? Landmark : type === 'event' ? Ticket : type === 'company' ? Building2 : LayoutGrid;

export default function MonumentTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const { height: H } = useWindowDimensions();
  const heroH = Math.round(H * 0.32);
  const { rows: cats } = useCategories();
  const [cat, setCat] = useState<string | undefined>(undefined);
  const { fmt } = usePrice();
  const { rows: favs, toggle } = useFavorites();

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
  const { rows: allEvents } = useEvents(undefined);
  const { pal: P } = useTheme();
  const s = React.useMemo(() => getStyles(P), [P]);

  // "Near Event": GPS-detect the tourist's governorate, show only its companies + events.
  const [gov, setGov] = useState<string | null>(null);
  const [govOpen, setGovOpen] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  const applyGov = (slug: string | null) => {
    setGov(slug);
    setGovOpen(false);
    setCat(undefined);
    setQuery('');
    setLocErr(null);
  };

  const enableNearby = async () => {
    // Tapping the active chip opens the picker to change governorate.
    if (gov) { setLocErr(null); setGovOpen(true); return; }
    setLocErr(null);
    setLocBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error(t('map.locDenied'));
      const pos = await Location.getCurrentPositionAsync({});
      const slug = detectGovernorate(pos.coords.latitude, pos.coords.longitude);
      if (!slug) {
        setLocErr(t('monument.detectFail'));
        setGovOpen(true);
        return;
      }
      applyGov(slug);
    } catch (e: any) {
      setLocErr(e.message);
      setGovOpen(true);
    } finally {
      setLocBusy(false);
    }
  };

  const pickCat = (id: string | undefined) => {
    setCat(id);
    setGov(null);
  };

  // Floating search: real DB results via the existing search engine.
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const reqId = useRef(0);
  useEffect(() => {
    const my = ++reqId.current;
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const h = setTimeout(async () => {
      try {
        const rows = await searchPlaces(query.trim(), 25);
        if (my !== reqId.current) return;
        setResults(rows);
      } catch { if (my === reqId.current) setResults([]); }
      finally { if (my === reqId.current) setSearching(false); }
    }, 250);
    return () => clearTimeout(h);
  }, [query]);

  // "From" prices for companies: cheapest available service, one query.
  const [minPrices, setMinPrices] = useState<Record<string, { price: number; currency: string }>>({});
  const compIds = [...new Set([...comps, ...allComps].map((r: any) => r.id))].sort().join(',');
  useEffect(() => {
    if (!compIds) return;
    (async () => {
      const { data } = await supabase
        .from('services')
        .select('company_id,current_price,currency')
        .in('company_id', compIds.split(','))
        .eq('available', true);
      const m: Record<string, { price: number; currency: string }> = {};
      for (const s of data ?? []) {
        const cur = m[s.company_id];
        if (!cur || Number(s.current_price) < cur.price) {
          m[s.company_id] = { price: Number(s.current_price), currency: s.currency };
        }
      }
      setMinPrices(m);
    })();
  }, [compIds]);

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

  // Near-Event mode: only the companies + events of the detected governorate (same-named merged, company first).
  let listData = merged;
  if (gov) {
    const gRank: Record<string, number> = { c: 0, e: 1 };
    const gByName = new Map<string, any>();
    for (const it of [
      ...allComps.filter((r: any) => r.governorate === gov).map((r: any) => ({ kind: 'c', r })),
      ...allEvents.filter((r: any) => r.governorate === gov).map((r: any) => ({ kind: 'e', r })),
    ]) {
      const n = normTitle(it.r);
      const cur = gByName.get(n);
      if (!cur || gRank[it.kind] < gRank[cur.kind]) gByName.set(n, it);
    }
    listData = [...gByName.values()];
  }
  // Search mode replaces the category list with live results.
  const searching_mode = query.trim().length > 0;
  if (searching_mode) {
    listData = results.map((r: any) => ({
      kind: r.kind === 'company' ? 'c' : r.kind === 'monument' ? 'm' : 'e',
      r,
    }));
  }

  const isEmpty = searching_mode
    ? !searching && listData.length === 0
    : gov
      ? listData.length === 0
      : rows.length === 0 && events.length === 0 && comps.length === 0;

  const clearAll = () => {
    setQuery('');
    pickCat(undefined);
    setGov(null);
    setLocErr(null);
  };

  const favKey = (kind: string, id: string) =>
    favs.some((f: any) => f.target_type === (kind === 'm' ? 'monument' : kind === 'e' ? 'event' : 'company') && f.target_id === id);
  const toggleFav = (kind: string, id: string) =>
    toggle(kind === 'm' ? 'monument' : kind === 'e' ? 'event' : 'company', id);

  const renderCard = ({ item }: any) => {
    const r = item.r;
    const kind = item.kind as ActivityKind;
    const title = lang === 'ar' ? (r.name_ar ?? r.title_ar) : (r.name_en ?? r.title_en);
    const desc = lang === 'ar' ? (r.description_ar ?? '') : (r.description_en ?? '');
    const href = kind === 'c' ? `/company/${r.id}` : kind === 'm' ? `/monument/${r.id}` : `/event/${r.id}`;
    const category = r.categories ? (lang === 'ar' ? r.categories.name_ar : r.categories.name_en) : undefined;
    let priceText: string | null = null;
    if (kind !== 'c' && r.price != null) {
      priceText = fmt(Number(r.price), r.currency ?? 'JOD');
    } else if (kind === 'c') {
      const mp = minPrices[r.id];
      if (mp) priceText = fmt(mp.price, mp.currency);
    }
    return (
      <ActivityCard
        image={kind === 'c' ? (r.cover_url ?? r.logo_url) : r.image_url}
        imageSeed={r.id ?? title}
        location={r.location}
        title={title}
        description={desc || undefined}
        category={category}
        rating={r.avg_rating ?? r.rating ?? null}
        reviewCount={r.review_count ?? null}
        priceText={priceText}
        kind={kind}
        rtl={rtl}
        fav={favKey(kind, r.id)}
        onFav={() => toggleFav(kind, r.id)}
        onPress={() => router.push(href as any)}
        favLabel={t('detail.favorite')}
        openLabel={title}
      />
    );
  };

  return (
    <View style={s.wrap}>
      <FlatList
        data={loading ? [] : listData}
        keyExtractor={(it: any) => `${it.kind}-${it.r.id}`}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={renderCard}
        ListHeaderComponent={
          <>
            <View style={[s.hero, { height: heroH }]}>
              <Image source={PHOTOS.petra} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['rgba(4,35,31,0.15)', 'rgba(4,35,31,0.70)']}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View entering={FadeIn.duration(500)} style={s.heroTop}>
                <Pressable
                  onPress={() => router.push('/(tabs)/map' as any)}
                  style={s.heroBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back')}
                >
                  {rtl ? <ArrowRight color="#fff" size={20} /> : <ArrowLeft color="#fff" size={20} />}
                </Pressable>
                <View style={s.heroBtnsRight}>
                  <Pressable
                    onPress={() => router.push('/scan' as any)}
                    style={s.heroBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('loyalty.scanTitle')}
                  >
                    <ScanLine color="#fff" size={20} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/(tabs)/map' as any)}
                    style={s.heroBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('tabs.map')}
                  >
                    <MapIcon color="#fff" size={20} />
                  </Pressable>
                </View>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(150).duration(500)} style={s.heroText}>
                <Text style={s.heroTitle}>{t('monument.heroTitle')}</Text>
                <Text style={s.heroSub}>{t('monument.heroSub')}</Text>
              </Animated.View>
            </View>

            <View style={s.searchFloat}>
              <Search color="#C17654" size={20} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('monument.searchPh')}
                placeholderTextColor="#8A7A72"
                style={s.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query ? (
                <Pressable accessibilityLabel={t('map.clearLabel')} onPress={() => setQuery('')}>
                  <X color="#8A7A72" size={18} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsIn}
              style={s.chips}
            >
              <Pressable
                onPress={() => { pickCat(undefined); setQuery(''); setGov(null); }}
                style={[s.chip, !cat && !gov && !query && s.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={t('monument.all')}
              >
                <LayoutGrid color={!cat && !gov && !query ? '#fff' : '#C17654'} size={16} />
                <Text style={[s.chipTxt, !cat && !gov && !query && s.chipTxtActive]}>{t('monument.all')}</Text>
              </Pressable>
              <Pressable
                onPress={enableNearby}
                disabled={locBusy}
                style={[s.chip, !!gov && s.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={t('monument.nearEvent')}
              >
                <MapPin color={gov ? '#fff' : '#C17654'} size={16} />
                <Text style={[s.chipTxt, !!gov && s.chipTxtActive]}>
                  {locBusy ? '…' : gov ? t(`gov.${gov}`) : t('monument.nearEvent')}
                </Text>
              </Pressable>
              {uniqCats.map((c) => {
                const active = !!selected && !gov && !query && norm(c.name_en) === norm(selected.name_en);
                const Icon = c.type === 'monument' ? Landmark : c.type === 'event' ? Ticket : c.type === 'company' ? Building2 : LayoutGrid;
                return (
                  <Pressable key={c.id} onPress={() => { pickCat(c.id); setQuery(''); }} style={[s.chip, active && s.chipActive]} accessibilityRole="button">
                    <Icon color={active ? '#fff' : '#C17654'} size={16} />
                    <Text style={[s.chipTxt, active && s.chipTxtActive]}>{lang === 'ar' ? c.name_ar : c.name_en}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {locErr ? <Text style={s.locErr}>{locErr}</Text> : null}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 20 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={s.skCard}>
                  <View style={s.skImg} />
                  <View style={{ padding: 16 }}>
                    <View style={s.skLine} />
                    <View style={[s.skLine, { width: '70%' }]} />
                    <View style={[s.skLine, { width: '40%' }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : error && !searching_mode ? (
            <ErrorState message={t('monument.loadFail')} onRetry={reload} />
          ) : isEmpty ? (
            <View style={s.empty}>
              <MapPin color="#C17654" size={40} />
              <Text style={s.emptyTitle}>{t('monument.emptyTitle')}</Text>
              <Text style={s.emptyDesc}>{t('monument.emptyDesc')}</Text>
              <Pressable onPress={clearAll} style={s.clearBtn} accessibilityRole="button">
                <Text style={s.clearTxt}>{t('monument.clearFilters')}</Text>
              </Pressable>
            </View>
          ) : searching ? (
            <View style={s.searchingRow}>
              <Text style={s.searchingTxt}>…</Text>
            </View>
          ) : null
        }
      />
      <Modal visible={govOpen} transparent animationType="slide" onRequestClose={() => setGovOpen(false)}>
        <Pressable style={s.govOverlay} onPress={() => setGovOpen(false)}>
          <View style={s.govSheet}>
            <View style={[s.govHead, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <Text style={s.govTitle}>{t('monument.chooseGov')}</Text>
              <Pressable onPress={() => setGovOpen(false)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <X color="#77736F" size={22} />
              </Pressable>
            </View>
            <ScrollView>
              {GOVERNORATES.map((g) => {
                const active = gov === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => applyGov(g)}
                    style={[s.govRow, { flexDirection: rtl ? 'row-reverse' : 'row' }, active && s.govRowActive]}
                    accessibilityRole="button"
                    accessibilityLabel={t(`gov.${g}`)}
                  >
                    <MapPin color={active ? '#fff' : '#C17654'} size={18} />
                    <Text style={[s.govTxt, active && s.govTxtActive]}>{t(`gov.${g}`)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (P: ScreenPal) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: P.bg },
  hero: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', backgroundColor: '#2B1A12' },
  heroTop: {
    position: 'absolute', top: 54, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  heroBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(20,15,10,0.38)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnsRight: { flexDirection: 'row', gap: 10 },
  heroText: { position: 'absolute', left: 24, right: 24, bottom: 64 },
  heroTitle: {
    fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  heroSub: { fontSize: 16, lineHeight: 23, color: 'rgba(255,255,255,0.94)', marginTop: 8 },
  searchFloat: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: P.card, borderRadius: 31, marginHorizontal: 20, marginTop: -31,
    minHeight: 62, paddingHorizontal: 20, zIndex: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: P.line,
  },
  searchInput: { flex: 1, fontSize: 16, color: P.ink, minHeight: 58 },
  chips: { marginTop: 14, marginBottom: 18 },
  chipsIn: { gap: 10, paddingHorizontal: 20, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: P.line, borderRadius: 999,
    paddingHorizontal: 16, height: 46, justifyContent: 'center', backgroundColor: P.card,
  },
  chipActive: { backgroundColor: '#D88B69', borderColor: '#D88B69' },
  chipTxt: { color: P.ink, fontWeight: '600', fontSize: 13 },
  chipTxtActive: { color: '#fff' },
  locErr: { color: '#C0392B', fontSize: 12, paddingHorizontal: 20, marginTop: 6, marginBottom: 10 },
  skCard: { backgroundColor: P.card, borderRadius: 22, overflow: 'hidden', marginHorizontal: 20, marginBottom: 18 },
  skImg: { width: '100%', height: 200, backgroundColor: P.skel },
  skLine: { height: 14, borderRadius: 7, backgroundColor: P.skel, marginTop: 10 },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: P.ink, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: P.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  clearBtn: { backgroundColor: '#D88B69', borderRadius: 22, paddingHorizontal: 28, minHeight: 48, justifyContent: 'center', marginTop: 16 },
  clearTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  searchingRow: { alignItems: 'center', padding: 20 },
  searchingTxt: { color: P.muted, fontSize: 16 },
  govOverlay: { flex: 1, backgroundColor: 'rgba(38,49,58,0.5)', justifyContent: 'flex-end' },
  govSheet: { backgroundColor: P.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '72%' },
  govHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  govTitle: { fontSize: 18, fontWeight: '800', color: P.ink },
  govRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14 },
  govRowActive: { backgroundColor: '#D88B69' },
  govTxt: { fontSize: 16, fontWeight: '600', color: P.ink },
  govTxtActive: { color: '#fff' },
});
