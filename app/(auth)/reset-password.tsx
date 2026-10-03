import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

/** Deep-link target for password reset (Supabase redirects back to app). */
export default function ResetPassword() {
  const { t } = useTranslation();
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('auth.forgotTitle')}</Text>
      <Text style={s.sub}>{t('auth.resetHint')}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  sub: { color: COLORS.secondaryText, marginTop: 8 },
});
