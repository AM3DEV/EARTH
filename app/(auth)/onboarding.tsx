import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { ONBOARDING_PHOTOS } from '../../constants/photos';
import { LanguageButton, LanguageSheet } from '../../components/LanguagePicker';
import { PrimaryButton } from '../../components/ui/Buttons';

const SLIDES = ['s1t', 's2t', 's3t', 's4t', 's5t'] as const;
const DESCS = ['s1d', 's2d', 's3d', 's4d', 's5d'] as const;

export default function Onboarding() {
  const { colors: C } = useTheme();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const [i, setI] = useState(0);
  const [showLang, setShowLang] = useState(false);
  const { height: H } = useWindowDimensions();

  const done = async () => {
    await AsyncStorage.setItem('jg.onboarded', '1');
    router.replace('/(auth)/login');
  };

  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View style={s.wrap}>
      <Image
        source={ONBOARDING_PHOTOS[i % ONBOARDING_PHOTOS.length]}
        style={[StyleSheet.absoluteFill, { height: H * 0.72 }]}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(43,26,18,0.55)']}
        locations={[0.55, 1]}
        style={[StyleSheet.absoluteFill, { height: H * 0.72 }]}
      />
      <View style={s.langWrap}>
        <LanguageButton onPress={() => setShowLang(true)} />
      </View>
      <Pressable onPress={done} style={s.skip} accessibilityRole="button" accessibilityLabel={t('common.skip')}>
        <Text style={s.skipTxt}>{t('common.skip')}</Text>
      </Pressable>
      <Animated.View key={i} entering={FadeInUp.duration(350)} style={s.panel}>
        <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>{t(`onboarding.${SLIDES[i]}`)}</Text>
        <Text style={[s.desc, { textAlign: rtl ? 'right' : 'left' }]}>{t(`onboarding.${DESCS[i]}`)}</Text>
        <View style={[s.dots, rtl && { flexDirection: 'row-reverse' }]}>
          {SLIDES.map((_, d) => (
            <View key={d} style={[s.dot, d === i && s.dotActive]} />
          ))}
        </View>
        {i < SLIDES.length - 1 ? (
          <PrimaryButton title={t('common.next')} onPress={() => setI(i + 1)} />
        ) : (
          <PrimaryButton title={t('onboarding.getStarted')} onPress={done} />
        )}
        <View style={{ height: 10 }} />
        <Pressable onPress={done} accessibilityRole="button" accessibilityLabel={t('onboarding.login')}>
          <Text style={s.loginLink}>{t('onboarding.login')}</Text>
        </Pressable>
      </Animated.View>
      <LanguageSheet visible={showLang} onClose={() => setShowLang(false)} />
    </View>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, justifyContent: 'flex-end' },
  langWrap: { position: 'absolute', top: 60, left: 20, zIndex: 5 },
  skip: {
    position: 'absolute', top: 60, right: 20, zIndex: 5,
    backgroundColor: 'rgba(43,26,18,0.45)', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8,
  },
  skipTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  panel: {
    backgroundColor: C.card, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 26, paddingBottom: 34,
    shadowColor: '#2B1A12', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  desc: { fontSize: 15, lineHeight: 23, color: C.secondaryText, marginTop: 10 },
  dots: { flexDirection: 'row', gap: 6, marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.primary, width: 24 },
  loginLink: { color: C.primaryDark, fontWeight: '700', textAlign: 'center', fontSize: 15 },
});
