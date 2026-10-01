import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { COLORS, RADIUS } from '../constants/colors';
import { EmptyState } from '../components/ui/States';
import { GenericCard } from '../components/cards/Cards';

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!q.trim()) { setRows([]); return; }
    const h = setTimeout(async () => {
      const { data } = await supabase.rpc('search_companies', { p_q: q.trim(), p_limit: 25, p_offset: 0 });
      setRows(data ?? []);
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  return (
    <View style={s.wrap}>
      <TextInput value={q} onChangeText={setQ} placeholder={t('common.search')} placeholderTextColor={COLORS.secondaryText} style={s.input} autoFocus />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <GenericCard image={item.cover_url ?? item.logo_url} title={lang === 'ar' ? item.name_ar : item.name_en} subtitle={item.location} onPress={() => router.push(`/company/${item.id}` as any)} />
        )}
        ListEmptyComponent={q ? <EmptyState message={t('map.noResults')} /> : null}
      />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  input: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, minHeight: 48, paddingHorizontal: 16, fontSize: 16, color: COLORS.text },
});
