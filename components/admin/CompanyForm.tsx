import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { isLat, isLng } from '../../lib/validation';
import { Field } from '../ui/Field';
import { BackButton } from '../ui/BackButton';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { SectionTitle, ToggleRow, OptionsPicker, ImageField, ImageGalleryField, Opt, useLocaleName, AdminGate, friendlyDbError } from './fields';
import { useTheme, Palette } from '../../lib/theme';
import { GOVERNORATES } from '../../constants/governorates';
import { sanitizeFor } from '../../lib/saveGuard';

/**
 * Company Create/Edit with sections:
 * Basic Info | Category | Media (logo + cover) | Location | Contact | Publishing
 */
export function CompanyForm({ initial, companyId }: { initial: any; companyId?: string }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStylesCompanyForm(C), [C]);
  const { t } = useTranslation();
  const router = useRouter();
  const locName = useLocaleName();
  const [v, setV] = useState<any>({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    category_id: null, logo_url: null, cover_url: null, gallery_urls: [],
    qr_points: 10,
    location: '', lat: null, lng: null, governorate: null, price: null, citizen_price: null, currency: 'JOD',
    phone: '', email: '', website: '', opening_hours: '',
    verified: false, active: true, ...initial,
  });
  const [cats, setCats] = useState<Opt[]>([]);
  const [parentName, setParentName] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  const regenQr = async () => {
    if (!companyId) return;
    const tok = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const { error } = await supabase.from('companies').update({ qr_token: tok }).eq('id', companyId);
    if (error) setErr(friendlyDbError(error));
    else set('qr_token', tok);
  };

  const qrRef = useRef<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  /** Export the store QR: PDF on mobile (share sheet), PNG download on web. */
  const downloadQrPdf = async () => {
    if (!v.qr_token) return;
    setErr(null); setPdfBusy(true);
    try {
      const b64: string = await new Promise((resolve, reject) => {
        try {
          qrRef.current?.toDataURL((d: string) => (d ? resolve(d) : reject(new Error('QR render failed'))));
        } catch (e) { reject(e); }
      });
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${b64}`;
        link.download = `qr-${String(v.name_en ?? 'company').replace(/\s+/g, '-').toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      const file = await Print.printToFileAsync({
        html: `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">`
          + `<img src="data:image/png;base64,${b64}" width="600" height="600" />`
          + `</body></html>`,
      });
      if (!file?.uri) throw new Error(t('form.pdfFail'));
      if (!(await Sharing.isAvailableAsync())) throw new Error(t('form.shareFail'));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Save QR PDF' });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('id,name_en,name_ar,type').order('name_en');
      setCats((data ?? []).map((c: any) => ({ id: c.id, label: locName(c.name_ar, c.name_en), sub: c.type ?? '' })));
    })();
  }, []);
  useEffect(() => {
    (async () => {
      // Parent label when creating a sub-company (?parent_id=).
      const pid = (initial as any)?.parent_company_id;
      if (pid && !companyId) {
        const { data } = await supabase.from('companies').select('name_en,name_ar').eq('id', pid).maybeSingle();
        if (data) setParentName(locName(data.name_ar, data.name_en));
      }
      // Children list when editing an existing company.
      if (companyId) {
        const { data } = await supabase.from('companies')
          .select('id,name_en,name_ar,description_en,description_ar,active')
          .eq('parent_company_id', companyId).order('name_en');
        setChildren(data ?? []);
      }
    })();
  }, [companyId]);

  const save = async () => {
    setErr(null); setBusy(true);
    try {
      if (!v.name_en?.trim() || !v.name_ar?.trim()) throw new Error(t('form.reqNames'));
      if (v.lat != null && !isLat(Number(v.lat))) throw new Error(t('form.badLat'));
      if (v.lng != null && !isLng(Number(v.lng))) throw new Error(t('form.badLng'));
      const cz = v.citizen_price === '' || v.citizen_price == null ? null : Number(v.citizen_price);
      if (cz != null && (isNaN(cz) || cz < 0)) throw new Error(t('form.negBase'));
      const pr = v.price === '' || v.price == null ? null : Number(v.price);
      if (pr != null && (isNaN(pr) || pr < 0)) throw new Error(t('form.negBase'));
      const payload = sanitizeFor('companies', { ...v, lat: v.lat ?? null, lng: v.lng ?? null, category_id: v.category_id ?? null, price: pr, citizen_price: cz });
      if (companyId) {
        const { error } = await supabase.from('companies').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', companyId);
        if (error) throw error;
        void logAdminAction('update', 'company', { entityId: companyId, entityName: v.name_en });
      } else {
        const { data, error } = await supabase.from('companies').insert(payload).select('id').single();
        if (error) throw error;
        void logAdminAction('create', 'company', { entityId: data.id, entityName: v.name_en });
      }
      router.back();
    } catch (e: any) { setErr(friendlyDbError(e)); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <BackButton />
      <AdminGate>
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{companyId ? t('form.editItem', { name: t('admin.companies') }) : t('form.addItem', { name: t('admin.companies') })}</Text>
      {!companyId && parentName ? (
        <Text style={s.hint}>{t('detail.partOf')}: {parentName}</Text>
      ) : null}

      <SectionTitle>{t('form.basic')}</SectionTitle>
      <Field label={t('form.nameEn')} value={String(v.name_en ?? '')} onChangeText={(x) => set('name_en', x)} />
      <Field label={t('form.nameAr')} value={String(v.name_ar ?? '')} onChangeText={(x) => set('name_ar', x)} />
      <Field label={t('form.descEn')} value={String(v.description_en ?? '')} onChangeText={(x) => set('description_en', x)} multiline />
      <Field label={t('form.descAr')} value={String(v.description_ar ?? '')} onChangeText={(x) => set('description_ar', x)} multiline />

      <SectionTitle>{t('form.category')}</SectionTitle>
      <OptionsPicker label={t('form.category')} value={v.category_id} options={cats} onChange={(id) => set('category_id', id)} placeholder={t('form.noCategory')} />

      <SectionTitle>{t('form.media')}</SectionTitle>
      <ImageField label={t('form.logo')} bucket="company" value={v.logo_url} onChange={(url) => set('logo_url', url)} />
      <ImageField label={t('form.cover')} bucket="company" value={v.cover_url} onChange={(url) => set('cover_url', url)} />
      <ImageGalleryField label={t('form.gallery')} bucket="company" value={v.gallery_urls ?? []} onChange={(urls) => set('gallery_urls', urls)} />

      <SectionTitle>{t('form.location')}</SectionTitle>
      <Field label={t('form.location')} value={String(v.location ?? '')} onChangeText={(x) => set('location', x)} />
      <Field label={t('form.lat')} value={v.lat == null ? '' : String(v.lat)} onChangeText={(x) => set('lat', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label={t('form.lng')} value={v.lng == null ? '' : String(v.lng)} onChangeText={(x) => set('lng', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />

      <SectionTitle>{t('form.governorate')}</SectionTitle>
      <OptionsPicker
        label={t('form.governorate')}
        value={v.governorate ?? null}
        options={GOVERNORATES.map((g) => ({ id: g, label: t(`gov.${g}`) }))}
        onChange={(id) => set('governorate', id)}
        placeholder={t('form.noCategory')}
      />

      <SectionTitle>{t('form.contact')}</SectionTitle>      <Field label={t('form.phone')} value={String(v.phone ?? '')} onChangeText={(x) => set('phone', x)} keyboardType="phone-pad" />
      <Field label={t('form.email')} value={String(v.email ?? '')} onChangeText={(x) => set('email', x)} keyboardType="email-address" autoCapitalize="none" />
      <Field label={t('form.website')} value={String(v.website ?? '')} onChangeText={(x) => set('website', x)} autoCapitalize="none" />
      <Field label={t('form.hours')} value={String(v.opening_hours ?? '')} onChangeText={(x) => set('opening_hours', x)} />

      <SectionTitle>{t('form.prices')}</SectionTitle>
      <Field label={t('form.baseTourist')} value={v.price == null ? '' : String(v.price)} onChangeText={(x) => set('price', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label={t('form.citizenPrice')} value={v.citizen_price == null ? '' : String(v.citizen_price)} onChangeText={(x) => set('citizen_price', x.trim() === '' ? null : Number(x))} keyboardType="numeric" />
      <Field label={t('form.currency')} value={String(v.currency ?? 'JOD')} onChangeText={(x) => set('currency', x)} />

      <SectionTitle>{t('form.publishing')}</SectionTitle>
      <ToggleRow label={t('form.verified')} value={!!v.verified} onChange={(x) => set('verified', x)} />
      <ToggleRow label={t('form.active')} value={!!v.active} onChange={(x) => set('active', x)} />

      {companyId ? (
        <>
          <SectionTitle>{t('detail.branches')}</SectionTitle>
          {children.map((ch) => (
            <Pressable
              key={ch.id}
              onPress={() => router.push(`/admin/company-edit/${ch.id}` as any)}
              style={s.subItem}
              accessibilityRole="button"
              accessibilityLabel={locName(ch.name_ar, ch.name_en)}
            >
              <Text style={s.subName}>{locName(ch.name_ar, ch.name_en)}{ch.active ? '' : ` · ${t('common.inactive')}`}</Text>
              {locName(ch.description_ar, ch.description_en) ? (
                <Text style={s.subDesc} numberOfLines={2}>{locName(ch.description_ar, ch.description_en)}</Text>
              ) : null}
            </Pressable>
          ))}
          <View style={{ height: 8 }} />
          <SecondaryButton
            title={`+ ${t('detail.addBranch')}`}
            onPress={() => router.push(`/admin/company-create?parent_id=${companyId}` as any)}
          />
        </>
      ) : null}

      <SectionTitle>{t('admin.qrTitle')}</SectionTitle>
      {companyId && v.qr_token ? (
        <>
          <View style={s.qrWrap}>
            <QRCode value={`JG1:${v.qr_token}`} size={180} getRef={(r: any) => { qrRef.current = r; }} />
          </View>
          <Text style={s.qrTok} selectable>JG1:{v.qr_token}</Text>
          <View style={{ height: 8 }} />
          <SecondaryButton title={pdfBusy ? '…' : t('form.dlPdf')} onPress={downloadQrPdf} />
          <Field label={t('admin.qrPoints')} value={String(v.qr_points ?? 10)} onChangeText={(x) => set('qr_points', Number(x) || 0)} keyboardType="numeric" />
          <Pressable onPress={regenQr} style={s.regen} accessibilityRole="button" accessibilityLabel={t('admin.regen')}>
            <Text style={s.regenTxt}>{t('admin.regen')}</Text>
          </Pressable>
          <Text style={s.hint}>{t('admin.printHint')}</Text>
        </>
      ) : (
        <Text style={s.hint}>{t('admin.saveFirst')}</Text>
      )}

      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
      </AdminGate>
    </View>
  );
}

const getStylesCompanyForm = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  err: { color: C.error, marginVertical: 8 },
  hint: { color: C.secondaryText, fontSize: 13, marginTop: 8 },
  qrWrap: { alignItems: 'center', padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 16 },
  qrTok: { textAlign: 'center', color: C.secondaryText, fontSize: 11, marginTop: 8 },
  regen: { borderWidth: 1, borderColor: C.border, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  regenTxt: { color: C.primaryDark, fontWeight: '700' },
  subItem: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: C.card },
  subName: { fontWeight: '700', color: C.text, fontSize: 15 },
  subDesc: { color: C.secondaryText, fontSize: 13, marginTop: 4 },
});
