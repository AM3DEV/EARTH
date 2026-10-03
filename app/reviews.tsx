import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/colors';
import { Card } from '../components/ui/Card';

export default function ReviewsScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <Text style={s.title}>{t('admin.reviews')}</Text>
      <Card><Text style={s.muted}>{t('admin.reviewsHint')}</Text></Card>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  muted: { color: COLORS.secondaryText },
});
