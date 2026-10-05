import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Palette } from '../../lib/theme';
import { BackButton } from '../../components/ui/BackButton';

/** Deep-link target for password reset (Supabase redirects back to app). */
export default function ResetPassword() {
  const { colors: C } = useTheme();
  const { t } = useTranslation();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <View style={s.wrap}>
      <BackButton />
      <Text style={s.title}>{t('auth.forgotTitle')}</Text>
      <Text style={s.sub}>{t('auth.resetHint')}</Text>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  sub: { color: C.secondaryText, marginTop: 8 },
});
