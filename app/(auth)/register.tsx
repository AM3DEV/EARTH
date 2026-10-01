import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signUpTourist } from '../../lib/auth';
import { isEmail, isUsername, isStrongPassword } from '../../lib/validation';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { ErrorState } from '../../components/ui/States';
import { COLORS } from '../../constants/colors';

export default function Register() {
  const { t } = useTranslation();
  const router = useRouter();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', username: '', password: '', confirm: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setErr(null);
    if (!isEmail(f.email)) return setErr('Invalid email');
    if (!isUsername(f.username)) return setErr('Invalid username (3-30, letters/numbers/_.-)');
    if (!isStrongPassword(f.password)) return setErr('Password must be 8+ characters');
    if (f.password !== f.confirm) return setErr('Passwords do not match');
    setBusy(true);
    try {
      await signUpTourist({ firstName: f.firstName, lastName: f.lastName, email: f.email, username: f.username, password: f.password });
      router.replace('/(tabs)/map');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{t('auth.register')}</Text>
      <Field label={t('auth.firstName')} value={f.firstName} onChangeText={(v) => setF({ ...f, firstName: v })} />
      <Field label={t('auth.lastName')} value={f.lastName} onChangeText={(v) => setF({ ...f, lastName: v })} />
      <Field label={t('auth.email')} value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" />
      <Field label={t('auth.username')} value={f.username} onChangeText={(v) => setF({ ...f, username: v })} autoCapitalize="none" />
      <Field label={t('auth.password')} value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
      <Field label={t('auth.confirmPassword')} value={f.confirm} onChangeText={(v) => setF({ ...f, confirm: v })} secureTextEntry />
      {err ? <ErrorState message={err} /> : null}
      <PrimaryButton title={busy ? '…' : t('auth.register')} onPress={go} disabled={busy} />
      <Link href="/(auth)/login" style={s.link}>{t('auth.haveAccount')}</Link>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  link: { marginTop: 16, color: COLORS.primary },
});
