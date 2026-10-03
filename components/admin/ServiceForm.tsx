import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, ImageGalleryField, Opt, useLocaleName, AdminGate, friendlyDbError } from './fields';
import { CURRENCIES } from '../../lib/currency';
import { COLORS } from '../../constants/colors';

const PRICE_OPTS = ['5', '10', '15', '20', '25', '30', '40', '50', '75', '100', '150', '200', '250', '300', '500'];
const isCustomPrice = (val: any) => val !== '' && val != null && !PRICE_OPTS.includes(String(val));

/** Price picker: preset amounts + Custom (reveals a numeric box). */
function PricePicker({ label, value, allowEmpty, onChange }: {
  label: string; value: any; allowEmpty?: boolean; onChange: (v: number | null) => void;
}) {
  const { t } = useTranslation();
  const str = value == null || value === '' ? '' : String(value);
  const showCustom = str !== '' && !PRICE_OPTS.includes(str);
  const opts: Opt[] = [
    ...(allowEmpty ? [{ id: '__same', label: t('form.sameAsTourist') }] : []),
    ...PRICE_OPTS.map((p) => ({ id: p, label: p })),
    { id: '__custom', label: t('form.custom') },
  ];
  return (
    <>
      <OptionsPicker
        label={label}
        value={allowEmpty && str === '' ? '__same' : showCustom ? '__custom' : str}
        options={opts}
        onChange={(id) => {
          if (id === '__same') onChange(null);
          else if (id === '__custom' || id === null) onChange(0);
          else onChange(Number(id) || 0);
        }}
        placeholder={t('form.pickPrice')}
      />
      {showCustom ? (
        <Field label={`${label} (${t('form.custom')})`} value={str} onChangeText={(x) => onChange(x.trim() === '' ? (allowEmpty ? null : 0) : Number(x))} keyboardType="numeric" />
      ) : null}
    </>
  );
}
export function ServiceForm({ initial, serviceId }: { initial: any; serviceId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const locName = useLocaleName();
  const [v, setV] = useState<any>({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    company_id: null, category_id: null, image_url: null, gallery_urls: [],
    available_from: '', available_to: '',
    base_price: 0, citizen_price: null, currency: 'JOD', max_booking: 100, current_booking: 0,
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
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error(t('form.reqNames'));
      if ((v.base_price ?? 0) < 0) throw new Error(t('form.negBase'));
      const cz = v.citizen_price === '' || v.citizen_price == null ? null : Number(v.citizen_price);
      if (cz != null && (isNaN(cz) || cz < 0)) throw new Error(t('form.negBase'));
      if ((v.max_booking ?? 0) < 0) throw new Error(t('form.negMax'));
      if ((v.current_booking ?? 0) < 0) throw new Error(t('form.negCur'));
      if ((v.current_booking ?? 0) > (v.max_booking ?? 0)) throw new Error(t('form.curExceeds'));
      const from = String(v.available_from ?? '').trim() || null;
      const to = String(v.available_to ?? '').trim() || null;
      if (from && to && from > to) throw new Error(t('form.badDates'));
      const payload = {
        ...v,
        company_id: v.company_id ?? null,
        category_id: v.category_id ?? null,
        image_url: v.image_url ?? null,
        gallery_urls: v.gallery_urls ?? [],
        available_from: from,
        available_to: to,
        base_price: Number(v.base_price) || 0,
        citizen_price: cz,
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
      <Text style={s.title}>{serviceId ? t('form.editItem', { name: t('admin.services') }) : t('form.addItem', { name: t('admin.services') })}</Text>

      <SectionTitle>{t('form.basic')}</SectionTitle>
      <Field label={t('form.nameEn')} value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label={t('form.nameAr')} value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label={t('form.descEn')} value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label={t('form.descAr')} value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />
      <Field label={t('form.duration')} value={String(v.duration ?? '')} onChangeText={(x) => set('duration', x)} placeholder={t('form.durPh')} />

      <SectionTitle>{t('form.company')} & {t('form.category')}</SectionTitle>
      <OptionsPicker label={t('form.company')} value={v.company_id} options={comps} onChange={(id) => set('company_id', id)} placeholder={t('form.noCompany')} />
      <OptionsPicker label={t('form.category')} value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder={t('form.noCategory')} />

      <SectionTitle>{t('form.media')}</SectionTitle>
      <ImageField label={t('form.serviceImage')} bucket="service" value={v.image_url} onChange={(url) => set('image_url', url)} />
      <ImageGalleryField label={t('form.gallery')} bucket="service" value={v.gallery_urls ?? []} onChange={(urls) => set('gallery_urls', urls)} />

      <SectionTitle>{t('form.prices')}</SectionTitle>
      <PricePicker label={t('form.baseTourist')} value={v.base_price} onChange={(n) => set('base_price', n ?? 0)} />
      <PricePicker label={t('form.citizenPrice')} value={v.citizen_price} allowEmpty onChange={(n) => set('citizen_price', n)} />
      <OptionsPicker
        label={t('form.currency')}
        value={v.currency ?? 'JOD'}
        options={[...CURRENCIES].map((c) => ({ id: c.code, label: `${c.symbol} ${c.code}` }))}
        onChange={(id) => set('currency', id ?? 'JOD')}
        placeholder={t('form.pickCurrency')}
      />

      <SectionTitle>{t('form.capAvail')}</SectionTitle>
      <Field label={t('form.maxBooking')} value={String(v.max_booking ?? 0)} onChangeText={(x) => set('max_booking', Number(x) || 0)} keyboardType="numeric" />
      <Field label={t('form.currentBooking')} value={String(v.current_booking ?? 0)} onChangeText={(x) => set('current_booking', Number(x) || 0)} keyboardType="numeric" />
      <Field label={t('form.fromDate')} value={String(v.available_from ?? '')} onChangeText={(x) => set('available_from', x)} placeholder={t('form.fromPh')} />
      <Field label={t('form.toDate')} value={String(v.available_to ?? '')} onChangeText={(x) => set('available_to', x)} placeholder={t('form.toPh')} />
      {serviceId ? (
        <View style={s.readonly}>
          <Text style={s.roLabel}>{t('form.curManaged')}</Text>
          <Text style={s.roVal}>{v.current_price ?? '—'} {v.currency ?? ''}</Text>
        </View>
      ) : null}

      <SectionTitle>{t('form.publishing')}</SectionTitle>
      <ToggleRow label={t('form.available')} value={!!v.available} onChange={(x) => set('available', x)} />

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
