import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { searchPlaces } from '../lib/search';
import { RADIUS } from '../constants/colors';
import { useTheme, Palette } from '../lib/theme';
import { EmptyState } from '../components/ui/States';
import { BackButton } from '../components/ui/BackButton';
import { GenericCard } from '../components/cards/Cards';

export default function SearchScreen() {
  const { colors: C } = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!q.trim()) { setRows([]); return; }
    const h = setTimeout(async () => {
      try {
        setRows(await searchPlaces(q.trim(), 25));
      } catch {
        setRows([]);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q]);
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View style={s.wrap}>
      <BackButton />
      <TextInput value={q} onChangeText={setQ} placeholder={t('common.search')} placeholderTextColor={C.secondaryText} style={s.input} autoFocus />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const href = item.kind === 'company' ? `/company/${item.id}`
            : item.kind === 'monument' ? `/monument/${item.id}`
            : `/event/${item.id}`;
          return (
            <GenericCard
              image={item.image_url}
              title={lang === 'ar' ? item.name_ar : item.name_en}
              subtitle={item.location}
              onPress={() => router.push(href as any)}
            />
          );
        }}
        ListEmptyComponent={q ? <EmptyState message={t('map.noResults')} /> : null}
      />
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 110 },
  input: { marginHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.full, minHeight: 50, paddingHorizontal: 18, fontSize: 16, color: '#2A2320' },
});
