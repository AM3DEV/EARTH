import React from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { persistLocale } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { COLORS, RADIUS } from '../constants/colors';

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const set = async (lng: 'en' | 'ar') => {
    await persistLocale(lng);
    await i18n.changeLanguage(lng);
    const rtl = lng === 'ar';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ language: lng }).eq('id', user.id);
    } catch {}
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(rtl);
    }
  };
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('profile.language')}</Text>
      {(['en', 'ar'] as const).map((l) => (
        <Pressable key={l} onPress={() => set(l)} style={[s.opt, i18n.language === l && s.active]}>
          <Text style={[s.txt, i18n.language === l && s.txtActive]}>{l === 'en' ? 'English' : 'العربية'}</Text>
        </Pressable>
      ))}
      <Text style={s.hint}>RTL layout applies automatically for Arabic.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  opt: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  active: { borderColor: COLORS.primary, backgroundColor: COLORS.softGreen },
  txt: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  txtActive: { color: COLORS.primaryDark },
  hint: { color: COLORS.secondaryText, marginTop: 8 },
});
