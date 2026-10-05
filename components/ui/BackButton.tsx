import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';

/** Floating circular return button for every pushed page (themed, RTL-aware). */
export function BackButton({ top = 54, style }: { top?: number; style?: any }) {
  const { colors: C } = useTheme();
  const { i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      style={[s.btn, { top, backgroundColor: C.card, borderColor: C.border }, rtl ? { right: 16 } : { left: 16 }, style]}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      {rtl ? <ArrowRight color={C.text} size={20} /> : <ArrowLeft color={C.text} size={20} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 4,
  },
});
