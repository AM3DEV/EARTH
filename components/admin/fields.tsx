import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { Switch } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS } from '../../constants/colors';
import { pickImage, uploadImage } from '../../lib/storage';
import { getMyRole } from '../../lib/auth';
import i18n from '../../lib/i18n';
import { PrimaryButton } from '../ui/Buttons';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.h}>{children}</Text>;
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <Text style={s.rowT}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

export interface Opt { id: string; label: string; sub?: string }

/** Expo Go-safe dropdown: button + modal list, no native picker needed. */
export function OptionsPicker({ label, value, options, onChange, placeholder }: {
  label: string; value?: string | null; options: Opt[]; onChange: (id: string | null) => void; placeholder?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={s.select} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={[s.selectTxt, !selected && s.placeholder]} numberOfLines={1}>
          {selected ? selected.label : (placeholder ?? 'Select…')}
        </Text>
        <Text style={s.chev}>›</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={s.closeBtn}><Text style={s.closeTxt}>✕</Text></Pressable>
            </View>
            <FlatList
              data={[{ id: '', label: placeholder ?? t('form.none'), sub: '' }, ...options]}
              keyExtractor={(o) => o.id || '__none'}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.opt, item.id === (value ?? '') && s.optActive]}
                  onPress={() => { onChange(item.id || null); setOpen(false); }}
                >
                  <Text style={[s.optTxt, item.id === (value ?? '') && s.optTxtActive]}>{item.label}</Text>
                  {item.sub ? <Text style={s.optSub}>{item.sub}</Text> : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Map known storage error messages to translated strings; pass through the rest. */
export function mapUploadError(e: any): string {
  const m = String(e?.message ?? e ?? '');
  const t = (k: string) => {
    try {
      const s = i18n.t(k);
      return typeof s === 'string' && s.length > 0 ? s : k;
    } catch {
      return k;
    }
  };
  if (m.includes('Photo permission denied')) return t('form.photoDenied');
  if (m.includes('Image too large')) return t('form.tooBig');
  if (m.includes('Could not read the picked image')) return t('form.unreadable');
  return m;
}

/** Admin image field: preview + pick from library + immediate upload to the given bucket. */
export function ImageField({ label, bucket, value, onChange }: {
  label: string; bucket: 'avatar' | 'monument' | 'event' | 'company' | 'service' | 'category';
  value?: string | null; onChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = async () => {
    setErr(null);
    try {
      const uri = await pickImage();
      if (!uri) return;
      setBusy(true);
      const url = await uploadImage(bucket, uri, `img-${Date.now()}`);
      onChange(url);
    } catch (e: any) { setErr(mapUploadError(e)); } finally { setBusy(false); }
  };

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.imgRow}>
        {value ? (
          <Image source={{ uri: value }} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]}><Text style={s.thumbTxt}>{i18n.t('form.noImage')}</Text></View>
        )}
        <View style={s.imgBtns}>
          <Pressable onPress={pick} disabled={busy} style={s.imgBtn} accessibilityRole="button" accessibilityLabel={`${i18n.t('form.pick')} ${label}`}>
            {busy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.imgBtnTxt}>{value ? i18n.t('form.change') : i18n.t('form.upload')}</Text>}
          </Pressable>
          {value ? (
            <Pressable onPress={() => onChange(null)} style={s.imgBtnGhost}><Text style={s.imgBtnGhostTxt}>{i18n.t('form.remove')}</Text></Pressable>
          ) : null}
        </View>
      </View>
      {err ? <Text style={s.err}>{err}</Text> : null}
    </View>
  );
}

/** Multi-picture gallery: add many at once, thumbnail strip, remove each. Uploads immediately. */
export function ImageGalleryField({ label, bucket, value, onChange, max = 8 }: {
  label: string; bucket: 'avatar' | 'monument' | 'event' | 'company' | 'service' | 'category';
  value?: string[] | null; onChange: (urls: string[]) => void; max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const urls = value ?? [];

  const add = async () => {
    setErr(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Photo permission denied');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, max - urls.length),
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.length) return;
      setBusy(true);
      const uploaded: string[] = [];
      for (const a of res.assets) {
        uploaded.push(await uploadImage(bucket, a.uri, `img-${Date.now()}`));
      }
      onChange([...urls, ...uploaded].slice(0, max));
    } catch (e: any) { setErr(mapUploadError(e)); } finally { setBusy(false); }
  };

  return (
    <View style={s.field}>
      <Text style={s.label}>{label} ({urls.length}/{max})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galRow}>
        {urls.map((u, i) => (
          <View key={`${u}-${i}`} style={s.galWrap}>
            <Image source={{ uri: u }} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" />
            <Pressable onPress={() => onChange(urls.filter((_, x) => x !== i))} style={s.galX} accessibilityRole="button" accessibilityLabel={i18n.t('form.remove')}>
              <Text style={s.galXTxt}>✕</Text>
            </Pressable>
          </View>
        ))}
        {urls.length < max ? (
          <Pressable onPress={add} disabled={busy} style={[s.thumb, s.thumbEmpty]} accessibilityRole="button" accessibilityLabel={i18n.t('form.upload')}>
            {busy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.galPlus}>＋</Text>}
          </Pressable>
        ) : null}
      </ScrollView>
      {err ? <Text style={s.err}>{err}</Text> : null}
    </View>
  );
}

export function useLocaleName() {
  const { i18n } = useTranslation();
  return (ar?: string | null, en?: string | null) => (i18n.language === 'ar' ? (ar ?? en ?? '') : (en ?? ar ?? ''));
}

/** Translate cryptic PostgREST errors into actionable admin messages. */
export function friendlyDbError(e: any): string {
  const m = String(e?.message ?? e ?? '');
  const t = (k: string) => {
    try {
      const s = i18n.t(k);
      return typeof s === 'string' && s.length > 0 ? s : k;
    } catch {
      return k;
    }
  };
  if (m.includes('schema cache') || (m.includes('Could not find') && m.includes('column')))
    return t('admin.errSchema');
  if (m.includes('row-level security') || m.includes('42501'))
    return t('admin.errAdmin');
  if (m.includes('duplicate key') || m.includes('23505'))
    return t('admin.errDupe');
  if (m.includes('foreign key') || m.includes('23503'))
    return t('admin.errFk');
  if (m.includes('not-null') || m.includes('23502'))
    return t('admin.errNotNull');
  if (m.includes('Failed to fetch') || m.includes('Network'))
    return t('admin.errNet');
  return m || t('common.error');
}

/** Blocks non-admins from create/edit forms with a clear message instead of an RLS failure. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    getMyRole().then(setRole).catch(() => setRole('user'));
  }, []);
  if (role === null) {
    return (
      <View style={s.gate}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  if (role !== 'admin' && role !== 'boss_admin') {
    return (
      <View style={s.gate}>
        <Text style={s.gateTitle}>{t('admin.gateTitle')}</Text>
        <Text style={s.gateTxt}>{t('admin.gateTxt', { role })}</Text>
        <View style={{ height: 12 }} />
        <PrimaryButton title={t('admin.goBack')} onPress={() => router.back()} />
      </View>
    );
  }
  return <>{children}</>;
}

const s = StyleSheet.create({
  h: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  rowT: { fontWeight: '600', color: COLORS.text },
  field: { marginBottom: 12 },
  label: { fontSize: 13, color: COLORS.secondaryText, marginBottom: 6, fontWeight: '600' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 48, paddingHorizontal: 14, backgroundColor: '#fff' },
  selectTxt: { fontSize: 16, color: COLORS.text, flex: 1 },
  placeholder: { color: COLORS.secondaryText },
  chev: { color: COLORS.secondaryText, fontSize: 20, transform: [{ rotate: '90deg' }] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 24 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 18, color: COLORS.secondaryText },
  opt: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: COLORS.border },
  optActive: { backgroundColor: COLORS.softGreen },
  optTxt: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  optTxtActive: { color: COLORS.primaryDark },
  optSub: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  imgRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 84, height: 84, borderRadius: 12, backgroundColor: '#eee', borderWidth: 1, borderColor: COLORS.border },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbTxt: { color: COLORS.secondaryText, fontSize: 12 },
  imgBtns: { flex: 1, gap: 6 },
  imgBtn: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  imgBtnTxt: { color: COLORS.primaryDark, fontWeight: '700' },
  imgBtnGhost: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  imgBtnGhostTxt: { color: COLORS.error, fontWeight: '600' },
  galRow: { gap: 8, paddingVertical: 2, alignItems: 'center' },
  galWrap: { position: 'relative' },
  galX: {
    position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center',
  },
  galXTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  galPlus: { color: COLORS.primaryDark, fontSize: 26, fontWeight: '700' },
  err: { color: COLORS.error, marginTop: 6, fontSize: 13 },
  gate: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  gateTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  gateTxt: { color: COLORS.secondaryText, textAlign: 'center', marginTop: 8 },
});
