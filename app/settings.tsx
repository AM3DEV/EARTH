import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/colors';
import { Card } from '../components/ui/Card';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const Row = ({ label, href }: { label: string; href: string }) => (
    <Pressable onPress={() => router.push(href as any)} style={s.row}>
      <Text style={s.txt}>{label}</Text><Text style={s.chev}>›</Text>
    </Pressable>
  );
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <Text style={s.title}>{t('settings.title')}</Text>
      <Card>
        <Row label={t('profile.language')} href="/language" />
        <Row label={t('settings.notifications')} href="/notifications" />
        <Row label={t('settings.about')} href="/about" />
        <Row label={t('settings.privacy')} href="/privacy" />
        <Row label={t('settings.terms')} href="/terms" />
      </Card>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderColor: COLORS.border },
  txt: { fontWeight: '600', color: COLORS.text, fontSize: 15 },
  chev: { color: COLORS.secondaryText },
});
