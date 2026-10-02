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
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error('English and Arabic names are required');
      if (v.lat != null && !isLat(Number(v.lat))) throw new Error('Invalid latitude (-90..90)');
      if (v.lng != null && !isLng(Number(v.lng))) throw new Error('Invalid longitude (-180..180)');
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
      <Text style={s.title}>{monumentId ? 'Edit Monument' : 'Add Monument'}</Text>

      <SectionTitle>Basic Information</SectionTitle>
      <Field label="Name (EN)" value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label="Name (AR)" value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label="Description (EN)" value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label="Description (AR)" value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>Category & Media</SectionTitle>
      <OptionsPicker label="Category" value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder="No category" />
      <ImageField label="Cover" bucket="monument" value={v.image_url} onChange={(url) => set('image_url', url)} />
      <ImageGalleryField label="More pictures" bucket="monument" value={v.gallery_urls ?? []} onChange={(urls) => set('gallery_urls', urls)} />

      <SectionTitle>Location & Visit</SectionTitle>
      <Field label="Location" value={String(v.location ?? '')} onChangeText={(x) => set('location', x)} placeholder="Petra" />
      <Field label="Latitude" value={v.lat == null ? '' : String(v.lat)} onChangeText={(x) => set('lat', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label="Longitude" value={v.lng == null ? '' : String(v.lng)} onChangeText={(x) => set('lng', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label="Price (empty = unavailable)" value={v.price == null ? '' : String(v.price)} onChangeText={(x) => set('price', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label="Currency" value={String(v.currency ?? 'USD')} onChangeText={(x) => set('currency', x)} />
      <Field label="Opening hours" value={String(v.opening_hours ?? '')} onChangeText={(x) => set('opening_hours', x)} placeholder="06:00-18:00" />

      <SectionTitle>Contact</SectionTitle>
      <Field label="Phone" value={String(v.phone ?? '')} onChangeText={(x) => set('phone', x)} keyboardType="phone-pad" />
      <Field label="Website" value={String(v.website ?? '')} onChangeText={(x) => set('website', x)} autoCapitalize="none" />

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
