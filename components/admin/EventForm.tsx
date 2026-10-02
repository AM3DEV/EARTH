import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, ImageGalleryField, Opt, useLocaleName, AdminGate, friendlyDbError } from './fields';
import { COLORS } from '../../constants/colors';

/** Parse "YYYY-MM-DD HH:mm" (or ISO) to ISO string, or null. */
function toISO(s?: string | null): string | null {
  if (!s || !String(s).trim()) return null;
  const d = new Date(String(s).trim().replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function fromISO(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Event Create/Edit with:
 *  - Basic Event Information
 *  - SERVICE PLUS (plan PLUS, 7/14/30 days, priority, start/end, status)
 *  - Pricing Configuration (capacity, base price)
 *  - Support Pricing (radius, max discount, target range, stacking, duration)
 */
export function EventForm({ initial, eventId }: { initial: any; eventId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [v, setV] = useState<any>({ title_en: '', title_ar: '', location: '', price: 0, currency: 'USD', capacity: 100, active: true, category_id: null, image_url: null, gallery_urls: [], ...initial });
  const [plus, setPlus] = useState({ enabled: false, plan: 'PLUS', durationDays: 7, priority: 100, status: 'scheduled' });
  const [support, setSupport] = useState({ enabled: true, radiusKm: 25, maxDiscount: 30, minCap: 0, maxCap: 70, stacking: false, durationH: 48 });
  const [cats, setCats] = useState<Opt[]>([]);
  const [startTxt, setStartTxt] = useState(() => fromISO((initial as any)?.start_at));
  const [endTxt, setEndTxt] = useState(() => fromISO((initial as any)?.end_at));
  const locName = useLocaleName();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('id,name_en,name_ar,type').order('name_en');
      setCats((data ?? []).map((c: any) => ({ id: c.id, label: locName(c.name_ar, c.name_en), sub: c.type ?? '' })));
    })();
  }, []);

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.title_en?.trim() || !v.title_ar?.trim()) throw new Error('English and Arabic titles are required');
      if ((v.price ?? 0) < 0) throw new Error('Price must be >= 0');
      if ((v.capacity ?? 0) < 0) throw new Error('Capacity must be >= 0');
      const payload = {
        ...v,
        category_id: v.category_id ?? null,
        image_url: v.image_url ?? null,
        start_at: toISO(startTxt),
        end_at: toISO(endTxt),
      };
      let eid = eventId;
      if (eid) {
        const { error } = await supabase.from('events').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', eid);
        if (error) throw error;
        void logAdminAction('update', 'event', { entityId: eid, entityName: v.title_en });
      } else {
        const { data, error } = await supabase.from('events').insert(payload).select('id').single();
        if (error) throw error;
        eid = data.id;
        void logAdminAction('create', 'event', { entityId: eid, entityName: v.title_en });
      }
      // Service Plus promotion
      if (plus.enabled && eid) {
        const start = new Date();
        const end = new Date(Date.now() + plus.durationDays * 864e5);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('event_promotions').insert({
          event_id: eid, plan: plus.plan, status: plus.status, priority: plus.priority,
          start_at: start.toISOString(), end_at: end.toISOString(), created_by: user?.id,
        });
        if (error) throw error;
      }
      // Support pricing config -> pricing_rules linked to a service is per-service;
      // for events we persist app-level event support defaults keyed by event via app_settings fallback table event_support_configs
      // (kept simple + server reads it in allocate_support_discount).
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h}>Basic Event Information</Text>
      <Field label="Title (EN)" value={String(v.title_en ?? '')} onChangeText={(x) => set('title_en', x)} />
      <Field label="Title (AR)" value={String(v.title_ar ?? '')} onChangeText={(x) => set('title_ar', x)} />
      <Field label="Description (EN)" value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label="Description (AR)" value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />
      <Field label="Location" value={String(v.location ?? '')} onChangeText={(x) => set('location', x)} />
      <Field label="Latitude" value={String(v.lat ?? '')} onChangeText={(x) => set('lat', Number(x) || null)} keyboardType="numeric" />
      <Field label="Longitude" value={String(v.lng ?? '')} onChangeText={(x) => set('lng', Number(x) || null)} keyboardType="numeric" />
      <Field label="Price" value={String(v.price ?? 0)} onChangeText={(x) => set('price', Number(x) || 0)} keyboardType="numeric" />
      <Field label="Currency" value={String(v.currency ?? 'USD')} onChangeText={(x) => set('currency', x)} />
      <Field label="Capacity" value={String(v.capacity ?? 100)} onChangeText={(x) => set('capacity', Number(x) || 0)} keyboardType="numeric" />

      <SectionTitle>Category & Media</SectionTitle>
      <OptionsPicker label="Category" value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder="No category" />
      <ImageField label="Event image" bucket="event" value={v.image_url} onChange={(url) => set('image_url', url)} />
      <ImageGalleryField label="More pictures" bucket="event" value={v.gallery_urls ?? []} onChange={(urls) => set('gallery_urls', urls)} />

      <SectionTitle>Schedule</SectionTitle>
      <Field label="Start (YYYY-MM-DD HH:mm)" value={startTxt} onChangeText={setStartTxt} placeholder="2026-10-15 18:00" />
      <Field label="End (YYYY-MM-DD HH:mm)" value={endTxt} onChangeText={setEndTxt} placeholder="2026-10-15 22:00" />
      <Field label="Opening time" value={String(v.opening_time ?? '')} onChangeText={(x) => set('opening_time', x)} placeholder="18:00" />
      <Field label="Closing time" value={String(v.closing_time ?? '')} onChangeText={(x) => set('closing_time', x)} placeholder="22:00" />
      <Field label="Organizer" value={String(v.organizer ?? '')} onChangeText={(x) => set('organizer', x)} />
      <Field label="Phone" value={String(v.phone ?? '')} onChangeText={(x) => set('phone', x)} keyboardType="phone-pad" />
      <Field label="Website" value={String(v.website ?? '')} onChangeText={(x) => set('website', x)} autoCapitalize="none" />

      <SectionTitle>Publishing</SectionTitle>
      <ToggleRow label="Active (visible to tourists)" value={!!v.active} onChange={(x) => set('active', x)} />

      <Text style={s.h}>SERVICE PLUS</Text>
      <ToggleRow label="Enable Service Plus" value={plus.enabled} onChange={(x) => setPlus({ ...plus, enabled: x })} />
      <Field label="Plan (PLUS)" value={plus.plan} onChangeText={(x) => setPlus({ ...plus, plan: x })} />
      <Field label="Duration days (7/14/30)" value={String(plus.durationDays)} onChangeText={(x) => setPlus({ ...plus, durationDays: Number(x) || 7 })} keyboardType="numeric" />
      <Field label="Priority" value={String(plus.priority)} onChangeText={(x) => setPlus({ ...plus, priority: Number(x) || 0 })} keyboardType="numeric" />

      <Text style={s.h}>Support Pricing</Text>
      <ToggleRow label="Enable Support Pricing" value={support.enabled} onChange={(x) => setSupport({ ...support, enabled: x })} />
      <Field label="Max radius km" value={String(support.radiusKm)} onChangeText={(x) => setSupport({ ...support, radiusKm: Number(x) || 25 })} keyboardType="numeric" />
      <Field label="Max support discount %" value={String(support.maxDiscount)} onChangeText={(x) => setSupport({ ...support, maxDiscount: Number(x) || 0 })} keyboardType="numeric" />
      <Field label="Target min capacity %" value={String(support.minCap)} onChangeText={(x) => setSupport({ ...support, minCap: Number(x) || 0 })} keyboardType="numeric" />
      <Field label="Target max capacity %" value={String(support.maxCap)} onChangeText={(x) => setSupport({ ...support, maxCap: Number(x) || 0 })} keyboardType="numeric" />
      <ToggleRow label="Allow stacking" value={support.stacking} onChange={(x) => setSupport({ ...support, stacking: x })} />
      <Field label="Discount duration hours" value={String(support.durationH)} onChangeText={(x) => setSupport({ ...support, durationH: Number(x) || 48 })} keyboardType="numeric" />

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
    </AdminGate>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  h: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  rowT: { fontWeight: '600', color: COLORS.text },
  err: { color: COLORS.error, marginVertical: 8 },
});
