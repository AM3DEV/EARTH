import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { LoadingState, EmptyState } from '../ui/States';

/** Generic admin list shell: table, titleKey, name picker, create/edit routes. */
export function AdminList({ table, titleKey, createHref, editBase, nameOf }: {
  table: string; titleKey: string; createHref: string; editBase: string;
  nameOf: (r: any, lang: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    const patch: any = {};
    if ('active' in r) patch.active = !r.active;
    else if ('available' in r) patch.available = !r.available;
    else return;
    await supabase.from(table).update(patch).eq('id', r.id);
    load();
  };
  const remove = async (r: any) => {
    await supabase.from(table).delete().eq('id', r.id);
    load();
  };

  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft color={COLORS.text} size={20} />
        </Pressable>
        <Text style={s.title}>{t(titleKey)}</Text>
        <Pressable style={s.create} onPress={() => router.push(createHref as any)}><Text style={s.createT}>+ {t('common.create')}</Text></Pressable>
      </View>
      {rows.length === 0 ? <EmptyState /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name} numberOfLines={1}>{nameOf(item, i18n.language)}</Text>
              <View style={s.row}>
                <Pressable onPress={() => router.push(`${editBase}/${item.id}` as any)}><Text style={s.act}>{t('common.edit')}</Text></Pressable>
                <Pressable onPress={() => toggleActive(item)}><Text style={s.act}>{item.active ?? item.available ? t('common.inactive') : t('common.active')}</Text></Pressable>
                <Pressable onPress={() => remove(item)}><Text style={[s.act, { color: COLORS.error }]}>{t('common.delete')}</Text></Pressable>
              </View>
            </View>
          )} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  create: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  createT: { color: '#fff', fontWeight: '700' },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: COLORS.text, fontSize: 15 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  act: { color: COLORS.primaryDark, fontWeight: '600' },
});
