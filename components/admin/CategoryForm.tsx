import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { Field } from '../ui/Field';
import { BackButton } from '../ui/BackButton';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, AdminGate, friendlyDbError } from './fields';
import { useTheme, Palette } from '../../lib/theme';

const TYPES = [
  { id: 'monument', labelKey: 'admin.monuments' },
  { id: 'event', labelKey: 'admin.events' },
  { id: 'company', labelKey: 'admin.companies' },
  { id: 'service', labelKey: 'admin.services' },
];

/**
 * Category Create/Edit — the easy way to manage the sections used
 * across monuments, events, companies and services.
 */
export function CategoryForm({ initial, categoryId }: { initial: any; categoryId?: string }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStylesCategoryForm(C), [C]);
  const { t } = useTranslation();
  const router = useRouter();
  const [v, setV] = useState<any>({ name_en: '', name_ar: '', description_en: '', description_ar: '', image_url: null, type: 'company', ...initial });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error(t('form.reqNames'));
      // Prevent duplicate category names (case-insensitive) — dupes show as doubled filter chips.
      const { data: dup } = await supabase.from('categories').select('id').ilike('name_en', v.name_en.trim()).limit(1);
      if (dup?.length && dup[0].id !== categoryId) throw new Error(t('form.dupeCat'));
      const payload = { ...v, image_url: v.image_url ?? null, type: v.type ?? null };
      if (categoryId) {
        const { error } = await supabase.from('categories').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', categoryId);
        if (error) throw error;
        void logAdminAction('update', 'category', { entityId: categoryId, entityName: v.name_en });
      } else {
        const { data, error } = await supabase.from('categories').insert(payload).select('id').single();
        if (error) throw error;
        void logAdminAction('create', 'category', { entityId: data.id, entityName: v.name_en });
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <BackButton />
      <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{categoryId ? t('form.editItem', { name: t('admin.categories') }) : t('form.addItem', { name: t('admin.categories') })}</Text>

      <SectionTitle>{t('form.names')}</SectionTitle>
      <Field label={t('form.nameEn')} value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label={t('form.nameAr')} value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label={t('form.descEn')} value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label={t('form.descAr')} value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>{t('form.usage')}</SectionTitle>
      <OptionsPicker label={t('form.usedFor')} value={v.type} options={TYPES.map((o) => ({ id: o.id, label: t(o.labelKey) }))} onChange={(id) => set('type', id)} placeholder={t('form.general')} />
      <Text style={s.hint}>{t('form.usedForHint')}</Text>

      <SectionTitle>{t('form.media')}</SectionTitle>
      <ImageField label={t('form.categoryImage')} bucket="category" value={v.image_url} onChange={(url) => set('image_url', url)} />

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
      </AdminGate>
    </View>
  );
}

const getStylesCategoryForm = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  hint: { fontSize: 13, color: C.secondaryText, marginTop: 2 },
  err: { color: C.error, marginVertical: 8 },
});
