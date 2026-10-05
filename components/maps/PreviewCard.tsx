import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { Stars } from '../ui/Card';

export function MapPreviewCard({ item, onView }: { item: any; onView: () => void }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const name = item.name_en && lang === 'en' ? item.name_en : (item.name_ar ?? item.title_en ?? item.title_ar ?? item.name_en);
  return (
    <View style={s.wrap}>
      {item.image_url || item.cover_url || item.logo_url ? (
        <Image source={{ uri: item.image_url ?? item.cover_url ?? item.logo_url }} style={s.img} contentFit="cover" />
      ) : null}
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {item.avg_rating ?? item.rating ? <Stars value={item.avg_rating ?? item.rating} /> : <Text style={s.muted}>{t('map.noReviews')}</Text>}
        {item.location ? <Text style={s.muted} numberOfLines={1}>{item.location}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t('map.viewDetails')} onPress={onView} style={s.btn}>
          <Text style={s.btnText}>{t('map.viewDetails')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: C.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  img: { width: 96, height: 104 },
  body: { flex: 1, padding: 10 },
  name: { fontWeight: '700', fontSize: 15, color: C.text },
  muted: { color: C.secondaryText, fontSize: 12, marginTop: 2 },
  btn: { marginTop: 8, backgroundColor: C.primary, borderRadius: RADIUS.md, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
