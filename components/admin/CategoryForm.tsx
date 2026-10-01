import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, AdminGate, friendlyDbError } from './fields';
import { COLORS } from '../../constants/colors';

const TYPES = [
  { id: 'monument', label: 'Monument' },
  { id: 'event', label: 'Event' },
  { id: 'company', label: 'Company' },
  { id: 'service', label: 'Service' },
];

/**
 * Category Create/Edit — the easy way to manage the sections used
 * across monuments, events, companies and services.
 */
export function CategoryForm({ initial, categoryId }: { initial: any; categoryId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [v, setV] = useState<any>({ name_en: '', name_ar: '', description_en: '', description_ar: '', image_url: null, type: 'company', ...initial });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error('English and Arabic names are required');
      const payload = { ...v, image_url: v.image_url ?? null, type: v.type ?? null };
      if (categoryId) {
        const { error } = await supabase.from('categories').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', categoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{categoryId ? 'Edit Category' : 'Add Category'}</Text>

      <SectionTitle>Names</SectionTitle>
      <Field label="Name (EN)" value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} placeholder="Restaurants" />
      <Field label="Name (AR)" value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} placeholder="مطاعم" />
      <Field label="Description (EN)" value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label="Description (AR)" value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>Usage</SectionTitle>
      <OptionsPicker label="Used for" value={v.type} options={TYPES} onChange={(id) => set('type', id)} placeholder="General" />
      <Text style={s.hint}>Companies, events, monuments and services pick from this list in their own forms.</Text>

      <SectionTitle>Media</SectionTitle>
      <ImageField label="Category image" bucket="category" value={v.image_url} onChange={(url) => set('image_url', url)} />

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
    </AdminGate>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  hint: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  err: { color: COLORS.error, marginVertical: 8 },
});
