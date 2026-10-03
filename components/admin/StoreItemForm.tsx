import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, Opt, AdminGate, friendlyDbError } from './fields';
import { COLORS } from '../../constants/colors';

const KINDS: Opt[] = [
  { id: 'percent', label: 'Percent %' },
  { id: 'fixed', label: 'Fixed amount' },
];

const DISCOUNT_OPTS: Opt[] = ['5', '10', '15', '20', '25', '30', '35', '40', '45', '50'].map((p) => ({
  id: p,
  label: `${p}%`,
}));

/** Store coupon Create/Edit: title, kind/value, points cost, image, active. */
export function StoreItemForm({ initial, itemId }: { initial: any; itemId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [v, setV] = useState<any>({
    title_en: '', title_ar: '', description_en: '', description_ar: '',
    kind: 'percent', value: 10, points_cost: 100, image_url: null, active: true, ...initial,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<any[]>([]);
  const [mintBusy, setMintBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  const loadCodes = async () => {
    if (!itemId) return;
    const { data } = await supabase.from('coupons').select('code,status,created_at').eq('store_item_id', itemId).order('created_at', { ascending: false }).limit(30);
    setCodes(data ?? []);
  };
  useEffect(() => { loadCodes(); }, [itemId]);

  const mint = async () => {
    if (!itemId) return;
    setErr(null); setMintBusy(true);
    try {
      const { data, error } = await supabase.rpc('mint_store_codes', { p_item_id: itemId, p_count: 10 });
      if (error) throw error;
      await loadCodes();
      setMintMsg(`Minted ${(data?.count ?? 10)} codes: ${(data?.codes ?? []).join(', ')}`);
    } catch (e: any) {
      setErr(friendlyDbError(e));
    } finally {
      setMintBusy(false);
    }
  };
  const [mintMsg, setMintMsg] = useState<string | null>(null);

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.title_en?.trim() || !v.title_ar?.trim()) throw new Error(t('form.reqTitles'));
      if ((v.value ?? 0) < 0) throw new Error(t('form.negValue'));
      if (v.kind === 'percent' && (v.value ?? 0) > 100) throw new Error(t('form.pctMax'));
      if ((v.points_cost ?? 0) < 0) throw new Error(t('form.negPoints'));
      const payload = {
        ...v,
        image_url: v.image_url ?? null,
        value: Number(v.value) || 0,
        points_cost: Math.round(Number(v.points_cost) || 0),
      };
      if (itemId) {
        const { error } = await supabase.from('store_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', itemId);
        if (error) throw error;
        void logAdminAction('update', 'store_item', { entityId: itemId, entityName: v.title_en });
      } else {
        const { data, error } = await supabase.from('store_items').insert(payload).select('id').single();
        if (error) throw error;
        void logAdminAction('create', 'store_item', { entityId: data.id, entityName: v.title_en });
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{itemId ? t('form.editItem', { name: t('store.title') }) : t('form.addItem', { name: t('store.title') })}</Text>

      <SectionTitle>{t('form.titles')}</SectionTitle>
      <Field label={t('form.titleEn')} value={String(v.title_en ?? '')} onChangeText={(x) => set('title_en', x)} />
      <Field label={t('form.titleAr')} value={String(v.title_ar ?? '')} onChangeText={(x) => set('title_ar', x)} />
      <Field label={t('form.descEn')} value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label={t('form.descAr')} value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>{t('form.couponCost')}</SectionTitle>
      <OptionsPicker label={t('form.kind')} value={v.kind} options={KINDS.map((k) => ({ ...k, label: k.id === 'percent' ? t('form.kindPercent') : t('form.kindFixed') }))} onChange={(id) => set('kind', id)} placeholder={t('form.kindPercent')} />
      {v.kind === 'percent' ? (
        <OptionsPicker
          label={t('form.discount')}
          value={String(v.value ?? 10)}
          options={DISCOUNT_OPTS}
          onChange={(id) => set('value', Number(id) || 10)}
          placeholder={t('form.pickDiscount')}
        />
      ) : (
        <Field label={t('form.fixedAmt')} value={String(v.value ?? 0)} onChangeText={(x) => set('value', Number(x) || 0)} keyboardType="numeric" />
      )}
      <Field label={t('form.pointsCost')} value={String(v.points_cost ?? 0)} onChangeText={(x) => set('points_cost', Number(x) || 0)} keyboardType="numeric" />
      <Text style={s.hint}>{t('form.fixedHint')}</Text>

      <SectionTitle>{t('form.media')}</SectionTitle>
      <ImageField label={t('form.image')} bucket="service" value={v.image_url} onChange={(url) => set('image_url', url)} />

      <SectionTitle>{t('form.publishing')}</SectionTitle>
      <ToggleRow label={t('form.activeStore')} value={!!v.active} onChange={(x) => set('active', x)} />

      {itemId ? (
        <>
          <SectionTitle>{t('store.title')} (EARTH-XXXX-XXX-XXX)</SectionTitle>
          <Pressable onPress={mint} disabled={mintBusy} style={s.mint} accessibilityRole="button" accessibilityLabel={t('form.mint10')}>
            <Text style={s.mintTxt}>{mintBusy ? '…' : t('form.mint10')}</Text>
          </Pressable>
          {mintMsg ? <Text style={s.mintOk}>{mintMsg}</Text> : null}
          {codes.map((c) => (
            <View key={c.code} style={s.codeRow}>
              <Text style={s.code} selectable>{c.code}</Text>
              <Text style={[s.codeSt, { color: c.status === 'active' ? COLORS.success : COLORS.secondaryText }]}>{c.status === 'active' ? t('common.active') : t('store.used')}</Text>
            </View>
          ))}
        </>
      ) : null}

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
    </AdminGate>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  hint: { color: COLORS.secondaryText, fontSize: 13, marginTop: 4 },
  err: { color: COLORS.error, marginVertical: 8 },
  mint: { backgroundColor: COLORS.primary, borderRadius: 10, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  mintTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  mintOk: { color: COLORS.success, fontSize: 13, marginTop: 8, fontWeight: '600' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, marginTop: 6, backgroundColor: COLORS.card },
  code: { fontWeight: '800', letterSpacing: 1, color: COLORS.text, fontSize: 14 },
  codeSt: { fontSize: 12, fontWeight: '700' },
});
