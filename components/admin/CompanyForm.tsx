import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { isLat, isLng } from '../../lib/validation';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, Opt, useLocaleName, AdminGate, friendlyDbError } from './fields';
import { COLORS } from '../../constants/colors';

/**
 * Company Create/Edit with sections:
 * Basic Info | Category | Media (logo + cover) | Location | Contact | Publishing
 */
export function CompanyForm({ initial, companyId }: { initial: any; companyId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const locName = useLocaleName();
  const [v, setV] = useState<any>({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    category_id: null, logo_url: null, cover_url: null,
    location: '', lat: null, lng: null, phone: '', email: '', website: '', opening_hours: '',
    verified: false, active: true, ...initial,
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
      const payload = { ...v, lat: v.lat ?? null, lng: v.lng ?? null, category_id: v.category_id ?? null };
      if (companyId) {
        const { error } = await supabase.from('companies').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', companyId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{companyId ? 'Edit Company' : 'Add Company'}</Text>

      <SectionTitle>Basic Information</SectionTitle>
      <Field label="Name (EN)" value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label="Name (AR)" value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label="Description (EN)" value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label="Description (AR)" value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>Category</SectionTitle>
      <OptionsPicker label="Category" value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder="No category" />

      <SectionTitle>Media</SectionTitle>
      <ImageField label="Logo" bucket="company" value={v.logo_url} onChange={(url) => set('logo_url', url)} />
      <ImageField label="Cover" bucket="company" value={v.cover_url} onChange={(url) => set('cover_url', url)} />

      <SectionTitle>Location</SectionTitle>
      <Field label="Location" value={String(v.location ?? '')} onChangeText={(x) => set('location', x)} placeholder="Amman" />
      <Field label="Latitude" value={v.lat == null ? '' : String(v.lat)} onChangeText={(x) => set('lat', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label="Longitude" value={v.lng == null ? '' : String(v.lng)} onChangeText={(x) => set('lng', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />

      <SectionTitle>Contact</SectionTitle>
      <Field label="Phone" value={String(v.phone ?? '')} onChangeText={(x) => set('phone', x)} keyboardType="phone-pad" />
      <Field label="Email" value={String(v.email ?? '')} onChangeText={(x) => set('email', x)} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website" value={String(v.website ?? '')} onChangeText={(x) => set('website', x)} autoCapitalize="none" />
      <Field label="Opening hours" value={String(v.opening_hours ?? '')} onChangeText={(x) => set('opening_hours', x)} placeholder="09:00-22:00" />

      <SectionTitle>Publishing</SectionTitle>
      <ToggleRow label="Verified" value={!!v.verified} onChange={(x) => set('verified', x)} />
      <ToggleRow label="Active (visible to tourists)" value={!!v.active} onChange={(x) => set('active', x)} />

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
});
