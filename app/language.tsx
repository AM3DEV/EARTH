import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { LANGS, applyLocale } from '../lib/i18n';
import { RADIUS } from '../constants/colors';
import { useTheme, Palette } from '../lib/theme';
import { PrimaryButton } from '../components/ui/Buttons';

export default function LanguageScreen() {
  const { colors: C } = useTheme();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const [sel, setSel] = useState(i18n.language);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (sel === i18n.language) return;
    setBusy(true); setSaved(false);
    try {
      await applyLocale(sel);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          {rtl ? <ArrowLeft color={C.text} size={20} style={{ transform: [{ scaleX: -1 }] }} /> : <ArrowLeft color={C.text} size={20} />}
        </Pressable>
        <Text style={s.title}>{t('profile.language')}</Text>
      </View>
      <FlatList
        data={[...LANGS]}
        keyExtractor={(l) => l.code}
        renderItem={({ item: l }) => {
          const active = sel === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => { setSel(l.code); setSaved(false); }}
              style={[s.opt, active && s.active]}
              accessibilityRole="button"
              accessibilityLabel={l.name}
            >
              <Text style={s.globe}>🌐</Text>
              <Text style={[s.txt, active && s.txtActive]}>{l.name}</Text>
              {active ? <Text style={s.check}>✓</Text> : null}
            </Pressable>
          );
        }}
      />
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy || sel === i18n.language} />
      {saved ? <Text style={s.saved}>{t('common.saved')}</Text> : null}
      <Text style={s.hint}>{t('profile.rtlHint')}</Text>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, padding: 16, paddingTop: 60 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: C.text },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    minHeight: 54, paddingHorizontal: 16, backgroundColor: C.card, marginBottom: 10,
  },
  active: { borderColor: C.primary, backgroundColor: C.softGreen },
  globe: { fontSize: 20 },
  txt: { flex: 1, fontSize: 16, color: C.text, fontWeight: '600' },
  txtActive: { color: C.primaryDark },
  check: { color: C.primaryDark, fontWeight: '800', fontSize: 16 },
  saved: { color: C.success, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  hint: { color: C.secondaryText, marginTop: 8 },
});
