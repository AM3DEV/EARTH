import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInWithEmailOrUsername, getMyRole } from '../../lib/auth';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { ErrorState } from '../../components/ui/States';
import { COLORS } from '../../constants/colors';

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setErr(null); setBusy(true);
    try {
      const { error } = await signInWithEmailOrUsername(id, pw);
      if (error) throw error;
      const role = await getMyRole();
      if (role === 'admin' || role === 'boss_admin') router.replace('/admin' as any);
      else router.replace('/(tabs)/map');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{t('auth.login')}</Text>
      <Text style={s.sub}>{t('app.tagline')}</Text>
      <Field label={t('auth.emailOrUsername')} value={id} onChangeText={setId} autoCapitalize="none" />
      <Field label={t('auth.password')} value={pw} onChangeText={setPw} secureTextEntry />
      {err ? <ErrorState message={err} /> : null}
      <PrimaryButton title={busy ? '…' : t('auth.login')} onPress={go} disabled={busy} />
      <View style={s.links}>
        <Link href="/(auth)/register">{t('auth.noAccount')}</Link>
        <Link href="/(auth)/forgot-password">{t('auth.forgot')}</Link>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  sub: { color: COLORS.secondaryText, marginBottom: 20, marginTop: 4 },
  links: { marginTop: 16, gap: 8 },
});
