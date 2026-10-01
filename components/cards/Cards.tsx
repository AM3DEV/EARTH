import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS } from '../../constants/colors';
import { Stars } from '../ui/Card';
import type { Company } from '../../types';

export function CompanyCard({ item, onPress, lang }: { item: Company; onPress: () => void; lang: string }) {
  const { t } = useTranslation();
  const name = lang === 'ar' ? item.name_ar : item.name_en;
  const rating = (item as any).avg_rating ?? item.rating;
  const count = (item as any).review_count;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={s.card}>
      <Image source={{ uri: item.cover_url ?? item.logo_url ?? undefined }} style={s.img} contentFit="cover" cachePolicy="memory-disk" />
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {rating ? <Stars value={rating} /> : <Text style={s.muted}>{t('map.noReviews')}</Text>}
        <Text style={s.muted}>{count != null ? t('map.reviews', { count }) : (item.location ?? '')}</Text>
        {item.location ? <Text style={s.loc} numberOfLines={1}>{item.location}</Text> : null}
      </View>
    </Pressable>
  );
}

export function GenericCard({ image, title, subtitle, meta, onPress }: { image?: string | null; title: string; subtitle?: string; meta?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.card}>
      {image ? <Image source={{ uri: image }} style={s.img} contentFit="cover" cachePolicy="memory-disk" /> : null}
      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={s.muted} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={s.loc}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  img: { width: '100%', height: 170, backgroundColor: '#F2F2F2' },
  body: { padding: 12 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  muted: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  loc: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
});
