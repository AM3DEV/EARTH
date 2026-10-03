import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { LoadingState, EmptyState } from '../../components/ui/States';

/** Easy category management: image, both names, usage type, edit/delete. */
export default function AdminCategories() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name_en').limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  // Refresh when coming back from create/edit so newly saved rows appear immediately.
  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <ArrowLeft color={COLORS.text} size={20} />
        </Pressable>
        <Text style={s.title}>{t('admin.categories')}</Text>
        <Pressable style={s.create} onPress={() => router.push('/admin/category-create' as any)}>
          <Text style={s.createT}>+ {t('common.create')}</Text>
        </Pressable>
      </View>
      {rows.length === 0 ? <EmptyState /> : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" />
              ) : null}
              <View style={s.body}>
                <Text style={s.name}>{lang === 'ar' ? item.name_ar : item.name_en}</Text>
                <Text style={s.muted}>{lang === 'ar' ? item.name_en : item.name_ar} · {item.type ?? t('form.general')}</Text>
                <View style={s.row}>
                  <Pressable onPress={() => router.push(`/admin/category-edit/${item.id}` as any)}>
                    <Text style={s.act}>{t('common.edit')}</Text>
                  </Pressable>
                  <Pressable onPress={async () => { await supabase.from('categories').delete().eq('id', item.id); load(); }}>
                    <Text style={[s.act, { color: COLORS.error }]}>{t('common.delete')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
  create: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  createT: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  thumb: { width: 84, height: 84 },
  body: { flex: 1, padding: 10 },
  name: { fontWeight: '700', color: COLORS.text, fontSize: 15 },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  act: { color: COLORS.primaryDark, fontWeight: '700' },
});
