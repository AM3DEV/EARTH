import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Heart, ArrowRight, ArrowLeft, Landmark, Ticket, Building2 } from 'lucide-react-native';
import { RADIUS, SHADOW } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { fallbackPhoto } from '../../constants/photos';

export type ActivityKind = 'm' | 'e' | 'c';

const KIND_ICONS: Record<ActivityKind, any> = {
  m: Landmark,
  e: Ticket,
  c: Building2,
};

export interface ActivityCardProps {
  image?: string | null;
  imageSeed?: string;
  location?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceText?: string | null;
  kind: ActivityKind;
  fav: boolean;
  onFav: () => void;
  onPress: () => void;
  rtl?: boolean;
  favLabel?: string;
  openLabel?: string;
}

/**
 * Premium activity card: cinematic image with location pill + favorite heart,
 * icon + title + description, category pill, rating + price + arrow action.
 */
export function ActivityCard(p: ActivityCardProps) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const img = p.image ?? fallbackPhoto(p.imageSeed ?? p.title);
  const KindIcon = KIND_ICONS[p.kind];
  const Arrow = p.rtl ? ArrowLeft : ArrowRight;
  return (
    <Pressable
      onPress={p.onPress}
      accessibilityRole="button"
      accessibilityLabel={p.openLabel ?? p.title}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View>
        <Image
          source={typeof img === 'string' ? { uri: img } : img}
          style={s.img}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {p.location ? (
          <View style={s.locPill}>
            <MapPin color="#fff" size={12} />
            <Text style={s.locTxt} numberOfLines={1}>{p.location}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={p.onFav}
          accessibilityRole="button"
          accessibilityLabel={p.favLabel ?? 'favorite'}
          style={({ pressed }) => [s.favBtn, p.fav && s.favOn, pressed && { transform: [{ scale: 0.9 }] }]}
        >
          <Heart color={p.fav ? '#fff' : '#C17654'} size={18} fill={p.fav ? '#fff' : 'transparent'} />
        </Pressable>
      </View>
      <View style={[s.body, p.rtl && { flexDirection: 'row-reverse' }]}>
        <View style={s.main}>
          <View style={[s.titleRow, p.rtl && { flexDirection: 'row-reverse' }]}>
            <View style={s.kindIcon}>
              <KindIcon color="#C17654" size={18} />
            </View>
            <Text style={s.title} numberOfLines={2}>{p.title}</Text>
          </View>
          {p.description ? <Text style={s.desc} numberOfLines={2}>{p.description}</Text> : null}
          {p.category ? (
            <View style={s.catRow}>
              <View style={s.catPill}>
                <Text style={s.catTxt} numberOfLines={1}>{p.category}</Text>
              </View>
            </View>
          ) : null}
        </View>
        <View style={s.side}>
          {p.rating != null ? (
            <Text style={s.rating}>
              <Text style={s.star}>★ </Text>
              {typeof p.rating === 'number' ? p.rating.toFixed(1) : p.rating}
              {p.reviewCount != null ? <Text style={s.count}> ({p.reviewCount})</Text> : null}
            </Text>
          ) : null}
          {p.priceText ? <Text style={s.price}>{p.priceText}</Text> : null}
          <Pressable
            onPress={p.onPress}
            accessibilityRole="button"
            accessibilityLabel={p.openLabel ?? p.title}
            style={({ pressed }) => [s.arrow, pressed && { transform: [{ scale: 0.92 }] }]}
          >
            <Arrow color="#fff" size={20} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: 22, marginBottom: 18,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...SHADOW.card,
  },
  img: { width: '100%', height: 200, backgroundColor: C.softGreen },
  locPill: {
    position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(193,118,84,0.94)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '60%',
  },
  locTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  favBtn: {
    position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', ...SHADOW.card,
  },
  favOn: { backgroundColor: '#D88B69' },
  body: { flexDirection: 'row', padding: 16, gap: 12 },
  main: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kindIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.softGreen, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  desc: { fontSize: 14, lineHeight: 20, color: C.secondaryText, marginTop: 8 },
  catRow: { marginTop: 10 },
  catPill: { alignSelf: 'flex-start', backgroundColor: C.softGreen, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  catTxt: { color: C.primary, fontSize: 12, fontWeight: '700' },
  side: { alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  rating: { fontSize: 14, fontWeight: '800', color: C.text },
  star: { color: '#D6A83A' },
  count: { fontSize: 12, fontWeight: '500', color: C.secondaryText },
  price: { fontSize: 19, fontWeight: '800', color: C.primary, marginTop: 4 },
  arrow: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#D88B69', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
