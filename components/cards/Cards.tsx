import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';
import { fallbackPhoto } from '../../constants/photos';
import { Stars } from '../ui/Card';
import { VerifiedBadge } from '../VerifiedBadge';
import type { Company } from '../../types';

export function CompanyCard({ item, onPress, lang }: { item: Company; onPress: () => void; lang: string }) {
  const { t } = useTranslation();
  const name = lang === 'ar' ? item.name_ar : item.name_en;
  const rating = (item as any).avg_rating ?? item.rating;
  const count = (item as any).review_count;
  const img = item.cover_url ?? item.logo_url ?? fallbackPhoto(item.id ?? name);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={s.card}>
      <Image source={typeof img === 'string' ? { uri: img } : img} style={s.img} contentFit="cover" cachePolicy="memory-disk" />
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {rating ? <Stars value={rating} /> : <Text style={s.muted}>{t('map.noReviews')}</Text>}
        <Text style={s.muted}>{count != null ? t('map.reviews', { count }) : (item.location ?? '')}</Text>
        {item.location ? <Text style={s.loc} numberOfLines={1}>{item.location}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Centered marketplace-style photo slider: rounded card, swipeable,
 * pagination dots. Used as the hero on detail pages.
 */
export function PhotoSlider({ urls, height = 280 }: { urls?: (string | number | null)[] | null; height?: number }) {
  const [pg, setPg] = React.useState(0);
  const { width: W } = useWindowDimensions();
  const w = W - 32;
  const slides = (urls ?? []).filter(Boolean) as (string | number)[];
  if (slides.length === 0) return null;
  return (
    <View style={[s.slideWrap, { height }]}>
      <FlatList
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPg(Math.round(e.nativeEvent.contentOffset.x / w))}
        renderItem={({ item }) => (
          <Image
            source={typeof item === 'string' ? { uri: item } : item}
            style={{ width: w, height }}
            contentFit="cover"
          />
        )}
      />
      {slides.length > 1 ? (
        <View style={s.slideDots}>
          {slides.map((_, i) => (
            <View key={i} style={[s.dot, i === pg && s.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function GalleryStrip({ urls }: { urls?: string[] | null }) {
  const list = (urls ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galRow}>
      {list.map((u, i) => (
        <Image key={`${i}-${u}`} source={{ uri: u }} style={s.gal} contentFit="cover" cachePolicy="memory-disk" />
      ))}
    </ScrollView>
  );
}

export function GenericCard({ image, title, subtitle, meta, onPress, verified }: { image?: string | null; title: string; subtitle?: string; meta?: string; onPress: () => void; verified?: boolean }) {
  const img = image ?? fallbackPhoto(title ?? 'place');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.card}>
      <Image source={typeof img === 'string' ? { uri: img } : img} style={s.img} contentFit="cover" cachePolicy="memory-disk" />
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.name} numberOfLines={2}>{title}</Text>
          {verified ? <VerifiedBadge /> : null}
        </View>
        {subtitle ? <Text style={s.muted} numberOfLines={2}>{subtitle}</Text> : null}
        {meta ? <Text style={s.loc}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 12, ...SHADOW.card },
  img: { width: '100%', height: 170, backgroundColor: COLORS.softGreen },
  body: { padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  muted: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  loc: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  galRow: { gap: 8, paddingVertical: 4 },
  gal: { width: 140, height: 100, borderRadius: RADIUS.md, backgroundColor: COLORS.softGreen },
  slideWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.softGreen, ...SHADOW.card },
  slideDots: { position: 'absolute', left: 0, right: 0, bottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotOn: { backgroundColor: '#fff', width: 20 },
});
