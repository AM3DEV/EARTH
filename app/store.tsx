import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { getWallet } from '../hooks/useBookings';
import { RADIUS, SHADOW } from '../constants/colors';
import { useTheme, Palette } from '../lib/theme';
import { LoadingState, EmptyState } from '../components/ui/States';

/** Points store: compact rows → detail page with description + buy. */
export default function StoreScreen() {
  const { colors: C } = useTheme();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const lang = i18n.language;
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await getWallet();
      setBalance(w?.points ?? 0);
      const { data: it } = await supabase.from('store_items').select('*').eq('active', true).order('points_cost');
      setItems(it ?? []);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: cp } = await supabase.from('coupons').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
        setCoupons(cp ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;

  const valueTxt = (it: any) => (it.kind === 'percent' ? `${it.value}%` : `${it.value}`);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowLeft color={C.text} size={20} style={{ transform: [{ scaleX: -1 }] }} /> : <ArrowLeft color={C.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('store.title')}</Text>
        <Text style={s.bal}>★ {balance}</Text>
      </View>

      {items.length === 0 ? <EmptyState message={t('store.empty')} /> : (
        <View style={{ padding: 16, paddingTop: 0 }}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={s.row}
              onPress={() => router.push(`/store/${item.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={lang === 'ar' ? item.title_ar : item.title_en}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={[s.thumb, s.thumbEmpty]}><Text style={s.gift}>🎟️</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{lang === 'ar' ? item.title_ar : item.title_en}</Text>
                <Text style={s.off}>{t('store.off', { value: valueTxt(item) })} · {t('store.cost', { cost: item.points_cost })}</Text>
              </View>
              <Text style={s.chev}>{rtl ? '‹' : '›'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={s.secTitle}>{t('store.myCoupons')}</Text>
      {coupons.length === 0 ? (
        <Text style={[s.muted, { paddingHorizontal: 16 }]}>{t('store.noCoupons')}</Text>
      ) : (
        coupons.map((c) => (
          <View key={c.id} style={s.coupon}>
            <Text style={s.codeSm} selectable>{c.code}</Text>
            <Text style={[s.pill, { backgroundColor: c.status === 'active' ? '#E3F3E9' : '#F1F1F1', color: c.status === 'active' ? C.success : C.secondaryText }]}>
              {c.status === 'active' ? t('common.active') : t('store.used')} · {c.kind === 'percent' ? `${c.value}%` : c.value}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: C.text },
  bal: { fontSize: 16, fontWeight: '800', color: C.gold },
  muted: { color: C.secondaryText, fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, padding: 10, marginBottom: 10, ...SHADOW.card,
  },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: C.softGreen },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  gift: { fontSize: 28 },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  off: { fontSize: 13, fontWeight: '800', color: C.primaryDark, marginTop: 2 },
  chev: { color: C.secondaryText, fontSize: 22, fontWeight: '700' },
  secTitle: { fontSize: 18, fontWeight: '800', color: C.text, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  coupon: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginHorizontal: 16, marginBottom: 8,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, padding: 12,
  },
  codeSm: { fontSize: 16, fontWeight: '800', letterSpacing: 1, color: C.text },
  pill: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, overflow: 'hidden' },
});
