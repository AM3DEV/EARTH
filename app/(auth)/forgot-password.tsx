import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { BackButton } from '../../components/ui/BackButton';
import { useTheme, Palette } from '../../lib/theme';

export default function ForgotPassword() {
  const { colors: C } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setMsg(error ? error.message : t('auth.checkEmail'));
  };
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <View style={s.wrap}>
      <BackButton />
      <Text style={s.title}>{t('auth.forgotTitle')}</Text>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <PrimaryButton title={t('auth.sendLink')} onPress={go} />
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      <Link href="/(auth)/login" style={s.link}>{t('auth.backToLogin')}</Link>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: C.background, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 16 },
  msg: { marginTop: 12, color: C.secondaryText },
  link: { marginTop: 16, color: C.primary },
});
