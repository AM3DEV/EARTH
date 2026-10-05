import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme, Palette } from '../../lib/theme';

/** Consistent top bar for every admin section page: back button + title. */
export function AdminHeader({ title }: { title: string }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStylesAdminHeader(C), [C]);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => router.back()}
        style={s.back}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <ArrowLeft color={C.text} size={20} style={rtl ? { transform: [{ scaleX: -1 }] } : undefined} />
      </Pressable>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const getStylesAdminHeader = (C: Palette) => StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  back: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: C.text, marginLeft: 10 },
});
