import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCategories, useMonuments } from '../../hooks/useMonuments';
import { useEvents } from '../../hooks/useEvents';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { GenericCard } from '../../components/cards/Cards';
import { COLORS, RADIUS } from '../../constants/colors';

export default function MonumentTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { rows: cats } = useCategories();
  const [cat, setCat] = useState<string | undefined>(undefined);
  const { rows, loading, error, reload } = useMonuments(cat);
  const { rows: events } = useEvents(cat);

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('monument.title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        <Pressable onPress={() => setCat(undefined)} style={[s.chip, !cat && s.chipActive]}>
          <Text style={[s.chipTxt, !cat && s.chipTxtActive]}>{t('monument.all')}</Text>
        </Pressable>
        {cats.map((c) => (
          <Pressable key={c.id} onPress={() => setCat(c.id)} style={[s.chip, cat === c.id && s.chipActive]}>
            <Text style={[s.chipTxt, cat === c.id && s.chipTxtActive]}>{lang === 'ar' ? c.name_ar : c.name_en}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={reload} /> : rows.length === 0 && events.length === 0 ? <EmptyState /> : (
        <FlatList
          data={[...rows.map((r: any) => ({ kind: 'm', r })), ...events.map((r: any) => ({ kind: 'e', r }))]}
          keyExtractor={(it: any) => `${it.kind}-${it.r.id}`}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: any) => {
            const r = item.r;
            const title = lang === 'ar' ? (r.name_ar ?? r.title_ar) : (r.name_en ?? r.title_en);
            if (item.kind === 'm') {
              return <GenericCard image={r.image_url} title={title} subtitle={r.location} meta={r.price ? `${r.price} ${r.currency ?? ''}` : t('detail.priceUnavailable')} onPress={() => router.push(`/monument/${r.id}` as any)} />;
            }
            return <GenericCard image={r.image_url} title={title} subtitle={r.location} meta={r.start_at?.slice(0, 10)} onPress={() => router.push(`/event/${r.id}` as any)} />;
          }}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  chips: { maxHeight: 48, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, height: 36, justifyContent: 'center', backgroundColor: '#fff' },
  chipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipTxt: { color: COLORS.text, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
});
