import React from 'react';
import { View, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMonuments } from '../../../hooks/useMonuments';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States';
import { GenericCard } from '../../../components/cards/Cards';

export default function CategoryList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { rows, loading, error, reload } = useMonuments(id);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!rows.length) return <EmptyState />;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 56 }}>
      <FlatList
        data={rows}
        keyExtractor={(r: any) => r.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <GenericCard image={item.image_url} title={lang === 'ar' ? item.name_ar : item.name_en} subtitle={item.location} onPress={() => router.push(`/monument/${item.id}` as any)} />
        )}
      />
    </View>
  );
}
