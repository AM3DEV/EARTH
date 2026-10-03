import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { getWallet } from '../hooks/useBookings';
import { COLORS, RADIUS, SHADOW } from '../constants/colors';
import { LoadingState, EmptyState } from '../components/ui/States';

/** Loyalty wallet: balance, earn/redeem history, how it works. */
export default function LoyaltyScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await getWallet();
      setPoints(w?.points ?? 0);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('loyalty_ledger')
          .select('*, companies(name_en,name_ar)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        setRows(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (loading) return <LoadingState />;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowLeft color={COLORS.text} size={20} style={{ transform: [{ scaleX: -1 }] }} /> : <ArrowLeft color={COLORS.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('loyalty.title')}</Text>
      </View>
      <LinearGradient colors={[COLORS.darkestGreen, COLORS.deepGreen]} style={s.band}>
        <Text style={s.balLabel}>{t('loyalty.balance')}</Text>
        <Text style={s.bal}>★ {points}</Text>
        <Text style={s.balSub}>{t('loyalty.points')}</Text>
      </LinearGradient>
      <Text style={s.how}>{t('loyalty.howItWorks')}</Text>
      {rows.length === 0 ? (
        <EmptyState message={t('loyalty.empty')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const earn = item.kind === 'earn';
            const co = item.companies ? (i18n.language === 'ar' ? item.companies.name_ar : item.companies.name_en) : '';
            return (
              <View style={s.row}>
                <Text style={[s.pts, { color: earn ? COLORS.success : COLORS.primaryDark }]}>
                  {earn ? `+${item.points}` : `${item.points}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.txt} numberOfLines={1}>{co || item.note || (earn ? t('loyalty.earn') : t('loyalty.redeem'))}</Text>
                  <Text style={s.muted}>{String(item.created_at).slice(0, 16).replace('T', ' ')}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  band: { marginHorizontal: 16, borderRadius: RADIUS.xl, padding: 22, alignItems: 'center' },
  balLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 1 },
  bal: { color: COLORS.gold, fontSize: 46, fontWeight: '800', marginTop: 4 },
  balSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  how: { color: COLORS.secondaryText, fontSize: 13, paddingHorizontal: 20, marginTop: 12, lineHeight: 19 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, ...SHADOW.card,
  },
  pts: { fontSize: 17, fontWeight: '800', minWidth: 56, textAlign: 'center' },
  txt: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
});
