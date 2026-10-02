import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, ImageGalleryField, Opt, useLocaleName, AdminGate, friendlyDbError } from './fields';
import { COLORS } from '../../constants/colors';

/**
 * Service Create/Edit with sections:
 * Basic Info | Company & Category | Media | Pricing & Capacity | Publishing
 * Note: current_price is server-managed (recalculated on booking) — shown read-only on edit.
 */
export function ServiceForm({ initial, serviceId }: { initial: any; serviceId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const locName = useLocaleName();
  const [v, setV] = useState<any>({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    company_id: null, category_id: null, image_url: null, gallery_urls: [],
    available_from: '', available_to: '',
    base_price: 0, currency: 'USD', max_booking: 100, current_booking: 0,
    duration: '', available: true, ...initial,
  });
  const [cats, setCats] = useState<Opt[]>([]);
  const [comps, setComps] = useState<Opt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  useEffect(() => {
    (async () => {
      const [c, co] = await Promise.all([
        supabase.from('categories').select('id,name_en,name_ar,type').order('name_en'),
        supabase.from('companies').select('id,name_en,name_ar,location').eq('active', true).order('name_en').limit(200),
      ]);
      setCats((c.data ?? []).map((x: any) => ({ id: x.id, label: locName(x.name_ar, x.name_en), sub: x.type ?? '' })));
      setComps((co.data ?? []).map((x: any) => ({ id: x.id, label: locName(x.name_ar, x.name_en), sub: x.location ?? '' })));
    })();
  }, []);

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error('English and Arabic names are required');
      if ((v.base_price ?? 0) < 0) throw new Error('Base price must be >= 0');
      if ((v.max_booking ?? 0) < 0) throw new Error('Max booking must be >= 0');
      if ((v.current_booking ?? 0) < 0) throw new Error('Current booking must be >= 0');
      if ((v.current_booking ?? 0) > (v.max_booking ?? 0)) throw new Error('Current booking cannot exceed max booking');
      const from = String(v.available_from ?? '').trim() || null;
      const to = String(v.available_to ?? '').trim() || null;
      if (from && to && from > to) throw new Error('Available-from date must be before available-to date');
      const payload = {
        ...v,
        company_id: v.company_id ?? null,
        category_id: v.category_id ?? null,
        image_url: v.image_url ?? null,
        gallery_urls: v.gallery_urls ?? [],
        available_from: from,
        available_to: to,
        base_price: Number(v.base_price) || 0,
        max_booking: Number(v.max_booking) || 0,
        current_booking: Number(v.current_booking) || 0,
      };
      if (serviceId) {
        const { error } = await supabase.from('services').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', serviceId);
        if (error) throw error;
        void logAdminAction('update', 'service', { entityId: serviceId, entityName: v.name_en });
      } else {
        const { data, error } = await supabase.from('services').insert({ ...payload, current_price: payload.base_price }).select('id').single();
        if (error) throw error;
        void logAdminAction('create', 'service', { entityId: data.id, entityName: v.name_en });
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{serviceId ? 'Edit Service' : 'Add Service'}</Text>

      <SectionTitle>Basic Information</SectionTitle>
      <Field label="Name (EN)" value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label="Name (AR)" value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label="Description (EN)" value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label="Description (AR)" value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />
      <Field label="Duration" value={String(v.duration ?? '')} onChangeText={(x) => set('duration', x)} placeholder="2 hours" />

      <SectionTitle>Company & Category</SectionTitle>
      <OptionsPicker label="Company" value={v.company_id} options={comps} onChange={(id) => set('company_id', id)} placeholder="No company" />
      <OptionsPicker label="Category" value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder="No category" />

      <SectionTitle>Media</SectionTitle>
      <ImageField label="Service image" bucket="service" value={v.image_url} onChange={(url) => set('image_url', url)} />
      <ImageGalleryField label="More pictures" bucket="service" value={v.gallery_urls ?? []} onChange={(urls) => set('gallery_urls', urls)} />

      <SectionTitle>Pricing & Capacity</SectionTitle>
      <Field label="Base price" value={String(v.base_price ?? 0)} onChangeText={(x) => set('base_price', Number(x) || 0)} keyboardType="numeric" />
      <Field label="Currency" value={String(v.currency ?? 'USD')} onChangeText={(x) => set('currency', x)} />
      <Field label="Max booking" value={String(v.max_booking ?? 0)} onChangeText={(x) => set('max_booking', Number(x) || 0)} keyboardType="numeric" />
      <Field label="Current booking" value={String(v.current_booking ?? 0)} onChangeText={(x) => set('current_booking', Number(x) || 0)} keyboardType="numeric" />
      <Field label="Available from (YYYY-MM-DD, optional)" value={String(v.available_from ?? '')} onChangeText={(x) => set('available_from', x)} placeholder="2026-11-01" />
      <Field label="Available to (YYYY-MM-DD, optional)" value={String(v.available_to ?? '')} onChangeText={(x) => set('available_to', x)} placeholder="2026-12-31" />
      {serviceId ? (
        <View style={s.readonly}>
          <Text style={s.roLabel}>Current price (server-managed)</Text>
          <Text style={s.roVal}>{v.current_price ?? '—'} {v.currency ?? ''}</Text>
        </View>
      ) : null}

      <SectionTitle>Publishing</SectionTitle>
      <ToggleRow label="Available for booking" value={!!v.available} onChange={(x) => set('available', x)} />

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
    </AdminGate>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  err: { color: COLORS.error, marginVertical: 8 },
  readonly: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginTop: 4 },
  roLabel: { fontSize: 12, color: COLORS.secondaryText, fontWeight: '600' },
  roVal: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 2 },
});
