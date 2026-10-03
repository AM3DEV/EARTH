import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { isLat, isLng } from '../../lib/validation';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, OptionsPicker, ImageField, ImageGalleryField, Opt, useLocaleName, AdminGate, friendlyDbError } from './fields';
import { COLORS } from '../../constants/colors';

/**
 * Monument Create/Edit with sections:
 * Basic Info | Category & Media (cover + gallery) | Location & Visit | Contact
 */
export function MonumentForm({ initial, monumentId }: { initial: any; monumentId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const locName = useLocaleName();
  const [v, setV] = useState<any>({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    category_id: null, image_url: null, gallery_urls: [],
    location: '', lat: null, lng: null, price: null, currency: 'USD',
    opening_hours: '', phone: '', website: '', ...initial,
  });
  const [cats, setCats] = useState<Opt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('id,name_en,name_ar,type').order('name_en');
      setCats((data ?? []).map((c: any) => ({ id: c.id, label: locName(c.name_ar, c.name_en), sub: c.type ?? '' })));
    })();
  }, []);

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error(t('form.reqNames'));
      if (v.lat != null && !isLat(Number(v.lat))) throw new Error(t('form.badLat'));
      if (v.lng != null && !isLng(Number(v.lng))) throw new Error(t('form.badLng'));
      const payload = {
        ...v,
        lat: v.lat ?? null,
        lng: v.lng ?? null,
        category_id: v.category_id ?? null,
        image_url: v.image_url ?? null,
        gallery_urls: v.gallery_urls ?? [],
        price: v.price === '' || v.price == null ? null : Number(v.price),
      };
      if (monumentId) {
        const { error } = await supabase.from('monuments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', monumentId);
        if (error) throw error;
        void logAdminAction('update', 'monument', { entityId: monumentId, entityName: v.name_en });
      } else {
        const { data, error } = await supabase.from('monuments').insert(payload).select('id').single();
        if (error) throw error;
        void logAdminAction('create', 'monument', { entityId: data.id, entityName: v.name_en });
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{monumentId ? t('form.editItem', { name: t('admin.monuments') }) : t('form.addItem', { name: t('admin.monuments') })}</Text>

      <SectionTitle>{t('form.basic')}</SectionTitle>
      <Field label={t('form.nameEn')} value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label={t('form.nameAr')} value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label={t('form.descEn')} value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label={t('form.descAr')} value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>{t('form.catMedia')}</SectionTitle>
      <OptionsPicker label={t('form.category')} value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder={t('form.noCategory')} />
      <ImageField label={t('form.cover')} bucket="monument" value={v.image_url} onChange={(url) => set('image_url', url)} />
      <ImageGalleryField label={t('form.gallery')} bucket="monument" value={v.gallery_urls ?? []} onChange={(urls) => set('gallery_urls', urls)} />

      <SectionTitle>{t('form.locVisit')}</SectionTitle>
      <Field label={t('form.location')} value={String(v.location ?? '')} onChangeText={(x) => set('location', x)} />
      <Field label={t('form.lat')} value={v.lat == null ? '' : String(v.lat)} onChangeText={(x) => set('lat', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label={t('form.lng')} value={v.lng == null ? '' : String(v.lng)} onChangeText={(x) => set('lng', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label={t('form.priceEmpty')} value={v.price == null ? '' : String(v.price)} onChangeText={(x) => set('price', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label={t('form.currency')} value={String(v.currency ?? 'USD')} onChangeText={(x) => set('currency', x)} />
      <Field label={t('form.hours')} value={String(v.opening_hours ?? '')} onChangeText={(x) => set('opening_hours', x)} />

      <SectionTitle>{t('form.contact')}</SectionTitle>
      <Field label={t('form.phone')} value={String(v.phone ?? '')} onChangeText={(x) => set('phone', x)} keyboardType="phone-pad" />
      <Field label={t('form.website')} value={String(v.website ?? '')} onChangeText={(x) => set('website', x)} autoCapitalize="none" />

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
    </AdminGate>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  err: { color: COLORS.error, marginVertical: 8 },
});
