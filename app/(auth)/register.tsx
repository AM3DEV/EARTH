import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { signUpTourist } from '../../lib/auth';
import { isEmail, isUsername, isStrongPassword } from '../../lib/validation';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { ErrorState } from '../../components/ui/States';
import { COLORS } from '../../constants/colors';
import { REGISTER_BG } from '../../constants/photos';

export default function Register() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
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
    <View style={s.root}>
      <Image source={REGISTER_BG} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(38,22,15,0.30)', 'rgba(38,22,15,0.78)']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.avoid}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.back()}
            style={[s.back, rtl ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft color="#fff" size={20} style={rtl ? { transform: [{ scaleX: -1 }] } : undefined} />
          </Pressable>
          <View style={s.card}>
            <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>{t('auth.register')}</Text>
            <Text style={[s.sub, { textAlign: rtl ? 'right' : 'left' }]}>{t('app.name')}</Text>
            <Field label={t('auth.firstName')} value={f.firstName} onChangeText={(v) => setF({ ...f, firstName: v })} />
            <Field label={t('auth.lastName')} value={f.lastName} onChangeText={(v) => setF({ ...f, lastName: v })} />
            <Field label={t('auth.email')} value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" />
            <Field label={t('auth.username')} value={f.username} onChangeText={(v) => setF({ ...f, username: v })} autoCapitalize="none" />
            <Field label={t('auth.password')} value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
            <Field label={t('auth.confirmPassword')} value={f.confirm} onChangeText={(v) => setF({ ...f, confirm: v })} secureTextEntry />
            {err ? <ErrorState message={err} /> : null}
            <PrimaryButton title={busy ? '…' : t('auth.register')} onPress={go} disabled={busy} />
            <Link href="/(auth)/login" style={s.switch}>{t('auth.haveAccount')}</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.darkestGreen },
  avoid: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 28 },
  back: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  card: {
    backgroundColor: 'rgba(250,250,247,0.98)', borderRadius: 24, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  sub: { color: COLORS.secondaryText, marginTop: 2, marginBottom: 16, fontSize: 14 },
  switch: { marginTop: 16, color: COLORS.primaryDark, fontWeight: '700', textAlign: 'center', fontSize: 15 },
});
