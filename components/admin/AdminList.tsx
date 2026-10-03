import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminLog';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';
import { LoadingState, EmptyState } from '../ui/States';
import { friendlyDbError } from './fields';
import { VerifiedBadge } from '../VerifiedBadge';

/** Generic admin list shell: table, titleKey, name picker, create/edit routes.
 * `bare` skips wrapper+header (tab embeds). `hideToggle` hides activate toggle
 * (tables without an active/available flag, e.g. monuments). */
export function AdminList({ table, titleKey, createHref, editBase, nameOf, bare, hideToggle }: {
  table: string; titleKey: string; createHref: string; editBase: string;
  nameOf: (r: any, lang: string) => string; bare?: boolean; hideToggle?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  // Refresh when coming back from create/edit so newly saved rows appear immediately.
  useFocusEffect(React.useCallback(() => { load(); }, []));

  const toggleActive = async (r: any) => {
    setErr(null);
    try {
      const patch: any = {};
      if ('active' in r) patch.active = !r.active;
      else if ('available' in r) patch.available = !r.available;
      else return;
      const { error } = await supabase.from(table).update(patch).eq('id', r.id);
      if (error) throw error;
      const nowOn = patch.active ?? patch.available;
      void logAdminAction(nowOn ? 'activate' : 'deactivate', table, { entityId: r.id, entityName: nameOf(r, i18n.language) });
      load();
    } catch (e: any) {
      setErr(friendlyDbError(e));
    }
  };
  const toggleVerified = async (r: any) => {
    if (!('verified' in r)) return;
    setErr(null);
    try {
      const { error } = await supabase.from(table).update({ verified: !r.verified }).eq('id', r.id);
      if (error) throw error;
      void logAdminAction(r.verified ? 'unverify' : 'verify', table, { entityId: r.id, entityName: nameOf(r, i18n.language) });
      load();
    } catch (e: any) {
      setErr(friendlyDbError(e));
    }
  };
  const remove = async (r: any) => {
    setErr(null);
    try {
      // Bookings are historical records (RESTRICT): refuse instead of failing silently.
      if (table === 'services') {
        const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('service_id', r.id);
        if ((count ?? 0) > 0) {
          throw new Error(`Cannot delete: ${count} booking(s) reference this service. Deactivate it instead — booking history must be preserved.`);
        }
      }
      if (table === 'companies') {
        const { data: svcs } = await supabase.from('services').select('id').eq('company_id', r.id);
        if (svcs?.length) {
          const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).in('service_id', svcs.map((s: any) => s.id));
          if ((count ?? 0) > 0) {
            throw new Error(`Cannot delete: ${count} booking(s) reference this company's services. Deactivate it instead — booking history must be preserved.`);
          }
        }
      }
      const { error } = await supabase.from(table).delete().eq('id', r.id);
      if (error) throw error;
      void logAdminAction('delete', table, { entityId: r.id, entityName: nameOf(r, i18n.language) });
      load();
    } catch (e: any) {
      setErr(friendlyDbError(e));
    }
  };

  if (loading && !bare) return <LoadingState />;
  const body = loading ? <LoadingState /> : rows.length === 0 ? <EmptyState /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.nameRow}>
                <Text style={s.name} numberOfLines={1}>{nameOf(item, i18n.language)}</Text>
                {'verified' in item && item.verified ? <VerifiedBadge /> : null}
              </View>
              <View style={s.row}>
                <Pressable onPress={() => router.push(`${editBase}/${item.id}` as any)}><Text style={s.act}>{t('common.edit')}</Text></Pressable>
                {hideToggle ? null : (
                  <Pressable onPress={() => toggleActive(item)}><Text style={s.act}>{item.active ?? item.available ? t('common.inactive') : t('common.active')}</Text></Pressable>
                )}
                {'verified' in item ? (
                  <Pressable onPress={() => toggleVerified(item)}><Text style={s.act}>{item.verified ? t('common.unverify') : t('common.verify')}</Text></Pressable>
                ) : null}
                <Pressable onPress={() => remove(item)}><Text style={[s.act, { color: COLORS.error }]}>{t('common.delete')}</Text></Pressable>
              </View>
            </View>
          )} />
      );
  if (bare) return <View style={s.bare}>{err ? <Text style={s.err}>{err}</Text> : null}{body}</View>;
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <ArrowLeft color={COLORS.text} size={20} />
        </Pressable>
        <Text style={s.title}>{t(titleKey)}</Text>
        <Pressable style={s.create} onPress={() => router.push(createHref as any)}><Text style={s.createT}>+ {t('common.create')}</Text></Pressable>
      </View>
      {err ? <Text style={s.err}>{err}</Text> : null}
      {body}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  bare: { flex: 1, backgroundColor: COLORS.background },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  create: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  createT: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, ...SHADOW.card },
  err: { color: COLORS.error, paddingHorizontal: 16, marginTop: 8, fontSize: 13, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontWeight: '700', color: COLORS.text, fontSize: 15 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  act: { color: COLORS.primaryDark, fontWeight: '600' },
});
