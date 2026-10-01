import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Marker, type Region } from '../../components/maps/NativeMap';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeInUp } from 'react-native-reanimated';
import { Search, X, ArrowLeft, Settings, MapPin } from 'lucide-react-native';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { JORDAN_REGION } from '../../constants/jordan';
import { COLORS, RADIUS } from '../../constants/colors';
import { useProfile } from '../../hooks/useAuth';
import { MapPreviewCard } from '../../components/maps/PreviewCard';
import { EmptyState } from '../../components/ui/States';
import { Stars } from '../../components/ui/Card';

type MarkerItem = { id: string; kind: 'monument' | 'event' | 'company'; lat: number; lng: number; raw: any };

export default function MapHome() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language;
  const mapRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  const { profile } = useProfile();

  const [region] = useState<Region>({ ...JORDAN_REGION });
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [selected, setSelected] = useState<MarkerItem | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const reqId = useRef(0);

  // Reanimated: compact bar -> expanded panel
  const panelY = useSharedValue(600);
  const panelOpacity = useSharedValue(0);
  const barScale = useSharedValue(1);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          mapRef.current?.animateToRegion({
            latitude: pos.coords.latitude, longitude: pos.coords.longitude,
            latitudeDelta: 0.5, longitudeDelta: 0.5,
          }, 800);
        }
      } catch { /* fallback to Jordan region — never break UX */ }
    })();
    loadMarkers();
  }, []);

  const loadMarkers = async () => {
    const [m, e, c] = await Promise.all([
      supabase.from('monuments').select('*').not('lat', 'is', null).limit(200),
      supabase.from('events').select('*').eq('active', true).not('lat', 'is', null).limit(200),
      supabase.from('companies').select('*').eq('active', true).not('lat', 'is', null).limit(200),
    ]);
    const out: MarkerItem[] = [];
    (m.data ?? []).forEach((r: any) => out.push({ id: `m-${r.id}`, kind: 'monument', lat: r.lat, lng: r.lng, raw: r }));
    (e.data ?? []).forEach((r: any) => out.push({ id: `e-${r.id}`, kind: 'event', lat: r.lat, lng: r.lng, raw: r }));
    (c.data ?? []).forEach((r: any) => out.push({ id: `c-${r.id}`, kind: 'company', lat: r.lat, lng: r.lng, raw: r }));
    setMarkers(out);
  };

  const openSearch = () => {
    setExpanded(true);
    panelY.value = withSpring(0, { damping: 26, stiffness: 260 });
    panelOpacity.value = withTiming(1, { duration: 220 });
    barScale.value = withTiming(1.02, { duration: 180 });
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    panelY.value = withTiming(600, { duration: 260 });
    panelOpacity.value = withTiming(0, { duration: 200 });
    barScale.value = withTiming(1, { duration: 180 });
    setTimeout(() => { setExpanded(false); }, 260);
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
    opacity: panelOpacity.value,
  }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scale: barScale.value }] }));

  // Debounced server-side search (200-300ms), cancel outdated via reqId
  useEffect(() => {
    const my = ++reqId.current;
    if (!expanded) return;
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const h = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('search_companies', { p_q: query.trim(), p_limit: 25, p_offset: 0 });
        if (my !== reqId.current) return; // outdated — drop
        if (error) throw error;
        setResults(data ?? []);
      } catch { if (my === reqId.current) setResults([]); }
      finally { if (my === reqId.current) setSearching(false); }
    }, 250);
    return () => clearTimeout(h);
  }, [query, expanded]);

  const focusMarker = useCallback((mk: MarkerItem) => {
    setSelected(mk);
    mapRef.current?.animateToRegion({ latitude: mk.lat, longitude: mk.lng, latitudeDelta: 0.2, longitudeDelta: 0.2 }, 600);
  }, []);

  const openDetail = (mk: MarkerItem) => {
    if (mk.kind === 'company') router.push(`/company/${mk.raw.id}` as any);
    else if (mk.kind === 'monument') router.push(`/monument/${mk.raw.id}` as any);
    else router.push(`/event/${mk.raw.id}` as any);
  };

  const pinColor = (k: string) => (k === 'monument' ? '#8A5A44' : k === 'event' ? COLORS.primary : '#2E8B57');

  return (
    <View style={s.wrap}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={region} showsUserLocation showsMyLocationButton>
        {markers.map((mk) => (
          <Marker
            key={mk.id}
            coordinate={{ latitude: mk.lat, longitude: mk.lng }}
            pinColor={pinColor(mk.kind)}
            onPress={() => focusMarker(mk)}
            opacity={selected?.id === mk.id ? 1 : 0.85}
          />
        ))}
      </MapView>

      {/* Header: profile (upper-left) + settings (upper-right) */}
      <View style={s.header} pointerEvents="box-none">
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/profile' as any)} style={s.profileChip}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}><Text style={s.avatarTxt}>{(profile?.first_name?.[0] ?? 'J').toUpperCase()}</Text></View>
          )}
          <Text style={s.profileName} numberOfLines={1}>{profile ? `${profile.first_name} ${profile.last_name}` : 'Jordan Guide'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings' as any)} style={s.iconBtn}>
          <Settings color={COLORS.text} size={20} />
        </Pressable>
      </View>

      {/* Selected marker preview */}
      {selected && !expanded ? (
        <Animated.View entering={FadeInUp.duration(250)} style={s.preview}>
          <MapPreviewCard item={selected.raw} onView={() => openDetail(selected)} />
        </Animated.View>
      ) : null}

      {/* Compact floating search bar (~90% opaque white, subtle border) */}
      {!expanded ? (
        <Animated.View style={[s.barWrap, barStyle]}>
          <Pressable accessibilityRole="search" accessibilityLabel={t('map.searchLabel')} onPress={openSearch} style={s.bar}>
            <Search color={COLORS.secondaryText} size={18} />
            <Text style={s.barText}>{t('map.searchPlaceholder')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Expanded search panel */}
      {expanded ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.panelAnchor} pointerEvents="box-none">
          <Animated.View style={[s.panel, panelStyle]} pointerEvents="auto">
            <View style={s.searchRow}>
              <Pressable accessibilityLabel={t('map.closeLabel')} onPress={closeSearch} style={s.iconBtn}>
                <ArrowLeft color={COLORS.text} size={20} />
              </Pressable>
              <View style={s.inputWrap}>
                <Search color={COLORS.secondaryText} size={16} />
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('map.searchPlaceholder')}
                  placeholderTextColor={COLORS.secondaryText}
                  style={s.input}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable accessibilityLabel={t('map.clearLabel')} onPress={() => setQuery('')}>
                    <X color={COLORS.secondaryText} size={16} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            {searching ? <Text style={s.hint}>…</Text> : null}
            <FlatList
              data={results}
              keyExtractor={(it) => it.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const name = lang === 'ar' ? item.name_ar : item.name_en;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    style={s.card}
                    onPress={() => {
                      closeSearch();
                      if (item.lat && item.lng) {
                        mapRef.current?.animateToRegion({ latitude: item.lat, longitude: item.lng, latitudeDelta: 0.2, longitudeDelta: 0.2 }, 600);
                        setSelected({ id: `c-${item.id}`, kind: 'company', lat: item.lat, lng: item.lng, raw: item });
                      }
                      router.push(`/company/${item.id}` as any);
                    }}
                  >
                    <Image source={{ uri: item.cover_url ?? item.logo_url ?? undefined }} style={s.cardImg} contentFit="cover" cachePolicy="memory-disk" />
                    <View style={s.cardBody}>
                      <Text style={s.cardName} numberOfLines={1}>{name}</Text>
                      {(item.avg_rating ?? item.rating) ? (
                        <Stars value={item.avg_rating ?? item.rating} />
                      ) : (
                        <Text style={s.muted}>{t('map.noReviews')}</Text>
                      )}
                      <Text style={s.muted}>
                        {item.review_count != null ? t('map.reviews', { count: item.review_count }) + ' · ' : ''}{item.location ?? ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={!searching && query ? <EmptyState message={t('map.noResults')} /> : null}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { position: 'absolute', top: 54, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  avatarTxt: { fontWeight: '800', color: COLORS.primaryDark },
  profileName: { marginLeft: 8, fontWeight: '600', fontSize: 13, color: COLORS.text, flexShrink: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  preview: { position: 'absolute', left: 14, right: 14, bottom: 150 },
  barWrap: { position: 'absolute', left: 14, right: 14, bottom: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 16, minHeight: 52, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  barText: { color: COLORS.secondaryText, fontSize: 15 },
  panelAnchor: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  panel: { backgroundColor: 'rgba(255,255,255,0.97)', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border, maxHeight: '78%', minHeight: '60%', padding: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, minHeight: 48 },
  input: { flex: 1, fontSize: 16, color: COLORS.text },
  hint: { color: COLORS.secondaryText, paddingHorizontal: 6, marginBottom: 4 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 10 },
  cardImg: { width: 92, height: 92 },
  cardBody: { flex: 1, padding: 10 },
  cardName: { fontWeight: '700', fontSize: 15, color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
});
