import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { getWallet } from '../hooks/useBookings';
import { COLORS, RADIUS, SHADOW } from '../constants/colors';
import { LoadingState, EmptyState } from '../components/ui/States';

/** Transactions: active coupon codes (copyable) + full points history. */
export default function TransactionsScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await getWallet();
      setPoints(w?.points ?? 0);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: cp } = await supabase
          .from('coupons')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        setCoupons(cp ?? []);
        const { data: lg } = await supabase
          .from('loyalty_ledger')
          .select('*, companies(name_en,name_ar)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        setRows(lg ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (loading) return <LoadingState />;

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
  };

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowLeft color={COLORS.text} size={20} style={{ transform: [{ scaleX: -1 }] }} /> : <ArrowLeft color={COLORS.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('store.transactions')}</Text>
        <Text style={s.bal}>★ {points}</Text>
      </View>

      <Text style={s.secTitle}>{t('store.activeCodes')}</Text>
      {coupons.length === 0 ? (
        <Text style={[s.muted, { paddingHorizontal: 16 }]}>{t('store.noActive')}</Text>
      ) : (
        coupons.map((c) => (
          <View key={c.id} style={s.coupon}>
            <View style={{ flex: 1 }}>
              <Text style={s.code} selectable>{c.code}</Text>
              <Text style={s.muted}>
                {c.kind === 'percent' ? `${c.value}%` : c.value} · {String(c.created_at).slice(0, 10)}
              </Text>
            </View>
            <Pressable onPress={() => copy(c.code)} style={s.copyBtn} accessibilityRole="button">
              <Text style={s.copyTxt}>{copied === c.code ? `✓ ${t('store.copied')}` : t('store.copy')}</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={s.secTitle}>{t('store.history')}</Text>
      {rows.length === 0 ? (
        <EmptyState message={t('loyalty.empty')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          renderItem={({ item }) => {
            const earn = item.kind === 'earn';
            const co = item.companies ? (i18n.language === 'ar' ? item.companies.name_ar : item.companies.name_en) : '';
            return (
              <View style={s.row}>
                <Text style={[s.pts, { color: earn ? COLORS.success : COLORS.primaryDark }]}>
                  {earn ? `+${item.points}` : `${item.points}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.txt} numberOfLines={1}>{co || item.note || ''}</Text>
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
  bal: { fontSize: 16, fontWeight: '800', color: COLORS.gold },
  secTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  coupon: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.gold,
    borderRadius: RADIUS.md, padding: 12, ...SHADOW.card,
  },
  code: { fontSize: 17, fontWeight: '800', letterSpacing: 1, color: COLORS.text },
  copyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  copyTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8,
  },
  pts: { fontSize: 16, fontWeight: '800', minWidth: 52, textAlign: 'center' },
  txt: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
});
