import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailOrUsername, getMyRole } from '../../lib/auth';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { ErrorState } from '../../components/ui/States';
import { COLORS } from '../../constants/colors';
import { LOGIN_BG } from '../../constants/photos';

export default function Login() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
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
    <View style={s.root}>
      <Image source={LOGIN_BG} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(38,22,15,0.35)', 'rgba(38,22,15,0.72)']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.avoid}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <Text style={s.flag}>🇯🇴</Text>
            <Text style={s.brandName}>Jordan</Text>
            <Text style={s.brandSub}>{t('app.tagline')}</Text>
          </View>
          <View style={s.card}>
            <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>{t('auth.login')}</Text>
            <Text style={[s.sub, { textAlign: rtl ? 'right' : 'left' }]}>{t('app.name')}</Text>
            <Field label={t('auth.emailOrUsername')} value={id} onChangeText={setId} autoCapitalize="none" />
            <Field label={t('auth.password')} value={pw} onChangeText={setPw} secureTextEntry onSubmitEditing={go} />
            <Link href="/(auth)/forgot-password" style={[s.forgot, { textAlign: rtl ? 'left' : 'right' }]}>
              {t('auth.forgot')}
            </Link>
            {err ? <ErrorState message={err} /> : null}
            <PrimaryButton title={busy ? '…' : t('auth.login')} onPress={go} disabled={busy} />
            <Link href="/(auth)/register" style={s.switch}>{t('auth.noAccount')}</Link>
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
  brand: { alignItems: 'center', marginBottom: 22 },
  flag: { fontSize: 56 },
  brandName: {
    fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: 3, marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  brandSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(250,250,247,0.98)', borderRadius: 24, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  sub: { color: COLORS.secondaryText, marginTop: 2, marginBottom: 16, fontSize: 14 },
  forgot: { color: COLORS.primaryDark, fontWeight: '700', marginBottom: 14, fontSize: 14 },
  switch: { marginTop: 16, color: COLORS.primaryDark, fontWeight: '700', textAlign: 'center', fontSize: 15 },
});
