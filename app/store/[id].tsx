import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { buyStoreItem, getWallet } from '../../hooks/useBookings';
import { RADIUS, SHADOW } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { PrimaryButton } from '../../components/ui/Buttons';

/** Store item detail: full picture, description, cost, buy → code + copy. */
export default function StoreItemDetail() {
  const { colors: C } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const lang = i18n.language;
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('store_items').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      setItem(data);
      const w = await getWallet();
      setBalance(w?.points ?? 0);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;
  if (!item) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const afford = balance >= item.points_cost;

  const buy = async () => {
    setMsg(null); setCode(null); setCopied(false); setBusy(true);
    try {
      const r = await buyStoreItem(item.id);
      setCode(r.code);
      setBalance(r.balance);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowLeft color={C.text} size={20} style={{ transform: [{ scaleX: -1 }] }} /> : <ArrowLeft color={C.text} size={20} />}
        </Pressable>
        <Text style={s.title} numberOfLines={1}>{lang === 'ar' ? item.title_ar : item.title_en}</Text>
        <Text style={s.bal}>★ {balance}</Text>
      </View>

      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={s.hero} contentFit="cover" cachePolicy="memory-disk" />
      ) : null}

      <View style={s.body}>
        <Text style={s.off}>
          {t('store.off', { value: item.kind === 'percent' ? `${item.value}%` : `${item.value}` })}
        </Text>
        {!!(lang === 'ar' ? item.description_ar : item.description_en) ? (
          <Text style={s.desc}>{lang === 'ar' ? item.description_ar : item.description_en}</Text>
        ) : null}
        <Text style={s.cost}>{t('store.cost', { cost: item.points_cost })}</Text>

        {code ? (
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>{t('store.gotCode')}</Text>
            <Text style={s.code} selectable>{code}</Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(code);
                setCopied(true);
                setTimeout(() => router.back(), 1200);
              }}
              style={s.copyBtn}
              accessibilityRole="button"
            >
              <Text style={s.copyTxt}>{copied ? `✓ ${t('store.copied')}` : t('store.copy')}</Text>
            </Pressable>
            <Text style={s.muted}>{t('store.codeHint')}</Text>
          </View>
        ) : null}
        {msg ? <Text style={s.err}>{msg}</Text> : null}

        <View style={{ height: 12 }} />
        <PrimaryButton
          title={busy ? '…' : `${t('store.buy')} · ${t('store.cost', { cost: item.points_cost })}`}
          onPress={buy}
          disabled={busy || !afford}
        />
        {!afford ? <Text style={s.muted}>{t('loyalty.needMore', { min: item.points_cost, have: balance })}</Text> : null}
      </View>
    </ScrollView>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: C.text },
  bal: { fontSize: 16, fontWeight: '800', color: C.gold },
  hero: { width: '100%', height: 220, backgroundColor: C.softGreen },
  body: { padding: 16 },
  off: { fontSize: 22, fontWeight: '800', color: C.primaryDark },
  desc: { fontSize: 15, lineHeight: 22, color: C.text, marginTop: 8 },
  cost: { fontSize: 17, fontWeight: '800', color: C.gold, marginTop: 10 },
  muted: { color: C.secondaryText, fontSize: 13, marginTop: 6, textAlign: 'center' },
  err: { color: C.error, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  codeBox: {
    marginTop: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.gold,
    borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', ...SHADOW.card,
  },
  codeLabel: { fontSize: 13, color: C.secondaryText, fontWeight: '700' },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 2, color: C.text, marginVertical: 6 },
  copyBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 22, minHeight: 44, justifyContent: 'center', marginVertical: 10 },
  copyTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
