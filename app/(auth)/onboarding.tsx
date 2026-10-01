import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { COLORS, RADIUS } from '../../constants/colors';
import { PrimaryButton, OutlineButton } from '../../components/ui/Buttons';

const SLIDES = ['s1t', 's2t', 's3t', 's4t', 's5t'] as const;
const DESCS = ['s1d', 's2d', 's3d', 's4d', 's5d'] as const;

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const [i, setI] = useState(0);

  const done = async () => {
    await AsyncStorage.setItem('jg.onboarded', '1');
    router.replace('/(auth)/login');
  };

  return (
    <View style={s.wrap}>
      <Animated.View key={i} entering={FadeInRight.duration(300)} style={s.slide}>
        <Text style={s.emoji}>🇯🇴</Text>
        <Text style={s.title}>{t(`onboarding.${SLIDES[i]}`)}</Text>
        <Text style={s.desc}>{t(`onboarding.${DESCS[i]}`)}</Text>
      </Animated.View>
      <View style={s.dots}>
        {SLIDES.map((_, d) => (
          <View key={d} style={[s.dot, d === i && s.dotActive]} />
        ))}
      </View>
      <View style={s.row}>
        {i < SLIDES.length - 1 ? (
          <PrimaryButton title={t('common.save') === 'Save' ? 'Next' : 'التالي'} onPress={() => setI(i + 1)} />
        ) : (
          <PrimaryButton title={t('onboarding.getStarted')} onPress={done} />
        )}
      </View>
      <View style={{ height: 10 }} />
      <OutlineButton title={t('onboarding.login')} onPress={done} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  slide: { alignItems: 'center', marginBottom: 24 },
  emoji: { fontSize: 72 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' },
  desc: { fontSize: 15, color: COLORS.secondaryText, marginTop: 8, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 22 },
  row: { marginBottom: 4 },
});
