import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Palette } from '../lib/theme';
import { BackButton } from '../components/ui/BackButton';
import { Card } from '../components/ui/Card';

export default function ReviewsScreen() {
  const { colors: C } = useTheme();
  const { t } = useTranslation();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <View style={s.wrap}>
      <BackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 110 }}>
        <Text style={s.title}>{t('admin.reviews')}</Text>
        <Card><Text style={s.muted}>{t('admin.reviewsHint')}</Text></Card>
      </ScrollView>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 12 },
  muted: { color: C.secondaryText },
});
