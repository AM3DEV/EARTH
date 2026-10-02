import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../hooks/useFavorites';
import { LoadingState, EmptyState } from '../components/ui/States';
import { COLORS, RADIUS, SHADOW } from '../constants/colors';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const { rows, loading } = useFavorites();
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('favorites.title')}</Text>
      {rows.length === 0 ? <EmptyState message={t('favorites.empty')} /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.heart}>♥</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.txt}>{item.target_type} · {item.target_id.slice(0, 8)}…</Text>
                <Text style={s.muted}>{item.created_at.slice(0, 10)}</Text>
              </View>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, ...SHADOW.card },
  heart: { color: COLORS.error, fontSize: 20 },
  txt: { fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 12 },
});
