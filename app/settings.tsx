import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Check } from 'lucide-react-native';
import { RADIUS } from '../constants/colors';
import { useTheme, Mode } from '../lib/theme';
import { BackButton } from '../components/ui/BackButton';
import { PrimaryButton } from '../components/ui/Buttons';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const { colors: C, mode, setMode } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  // Pending appearance choice — applied on Save, then back to the Settings tab.
  const [pending, setPending] = React.useState<Mode>(mode);

  const save = () => {
    setMode(pending);
    router.back();
  };

  const Row = ({ label, href, last }: { label: string; href: string; last?: boolean }) => (
    <Pressable onPress={() => router.push(href as any)} style={[s.row, last && s.rowLast]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={s.txt}>{label}</Text><Text style={s.chev}>›</Text>
    </Pressable>
  );

  const ModeBtn = ({ m, icon, label }: { m: Mode; icon: React.ReactNode; label: string }) => {
    const active = pending === m;
    return (
      <Pressable
        onPress={() => setPending(m)}
        style={[s.modeBtn, active && s.modeBtnActive]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
      >
        {icon}
        <Text style={[s.modeTxt, active && s.modeTxtActive]}>{label}</Text>
        {active ? <Check size={18} color="#fff" /> : null}
      </Pressable>
    );
  };

  return (
    <View style={s.wrap}>
      <BackButton />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 110, paddingBottom: 32 }}>
        <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>{t('settings.title')}</Text>

        <Text style={[s.sec, { textAlign: rtl ? 'right' : 'left' }]}>{t('settings.theme')}</Text>
        <View style={[s.modes, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <ModeBtn m="light" icon={<Sun size={20} color={pending === 'light' ? '#fff' : C.primary} />} label={t('settings.light')} />
          <ModeBtn m="dark" icon={<Moon size={20} color={pending === 'dark' ? '#fff' : C.primary} />} label={t('settings.dark')} />
        </View>
        <View style={{ height: 12 }} />
        <PrimaryButton title={t('common.save')} onPress={save} />

        <View style={{ height: 18 }} />
        <View style={s.card}>
          <Row label={t('profile.language')} href="/language" />
          <Row label={t('settings.notifications')} href="/notifications" />
          <Row label={t('settings.about')} href="/about" />
          <Row label={t('settings.privacy')} href="/privacy" />
          <Row label={t('settings.terms')} href="/terms" last />
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (C: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 4 },
  sec: { fontSize: 14, fontWeight: '700', color: C.secondaryText, marginTop: 12, marginBottom: 8 },
  modes: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    borderRadius: RADIUS.lg, minHeight: 54,
  },
  modeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  modeTxt: { fontWeight: '700', fontSize: 15, color: C.text },
  modeTxtActive: { color: '#fff' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  rowLast: { borderBottomWidth: 0 },
  txt: { fontWeight: '600', color: C.text, fontSize: 15 },
  chev: { color: C.secondaryText, fontSize: 18 },
});
