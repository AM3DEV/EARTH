import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useMonuments } from '../../../hooks/useMonuments';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States';
import { GenericCard } from '../../../components/cards/Cards';
import { COLORS } from '../../../constants/colors';

export default function CategoryList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const { rows, loading, error, reload } = useMonuments(id);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowRight color={COLORS.text} size={20} /> : <ArrowLeft color={COLORS.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('monument.title')}</Text>
      </View>
      {rows.length === 0 ? <EmptyState /> : (
        <FlatList
          data={rows}
          keyExtractor={(r: any) => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: any) => (
            <GenericCard image={item.image_url} title={lang === 'ar' ? item.name_ar : item.name_en} subtitle={item.location} onPress={() => router.push(`/monument/${item.id}` as any)} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 56 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border,
    zIndex: 10, elevation: 4,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text },
});
