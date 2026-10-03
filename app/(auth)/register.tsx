import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { signUpTourist } from '../../lib/auth';
import { isEmail, isUsername, isStrongPassword } from '../../lib/validation';
import { pickImage, uploadImage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';
import { ErrorState } from '../../components/ui/States';
import { COLORS, RADIUS } from '../../constants/colors';
import { REGISTER_BG } from '../../constants/photos';
import { CURRENCIES } from '../../lib/currency';

function KindArt({ kind }: { kind: 'citizen' | 'tourist' }) {
  const src = kind === 'citizen'
    ? require('../../assets/citizen.png')
    : require('../../assets/tourist.png');
  return <Image source={src} style={s.kindImg} contentFit="cover" />;
}

/**
 * 3-step registration:
 *  1. Email + password + confirm
 *  2. Name + username + profile picture
 *  3. Jordan Citizen 🇯🇴 or Tourist 🧳 → home
 * Account is created once at the end (no orphans on abandon).
 */
export default function Register() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [kind, setKind] = useState<'citizen' | 'tourist' | null>(null);
  const [currency, setCurrency] = useState('JOD');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next1 = () => {
    setErr(null);
    if (!isEmail(email)) return setErr(t('auth.invalidEmail'));
    if (!isStrongPassword(password)) return setErr(t('auth.weakPass'));
    if (password !== confirm) return setErr(t('auth.mismatch'));
    setStep(2);
  };

  const next2 = () => {
    setErr(null);
    if (!firstName.trim() || !lastName.trim()) return setErr(t('auth.needNames'));
    if (!isUsername(username)) return setErr(t('auth.badUser'));
    setStep(3);
  };

  const pickPhoto = async () => {
    setErr(null);
    try {
      const uri = await pickImage();
      if (uri) setPhoto(uri);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const finish = async () => {
    if (!kind) return setErr(t('auth.chooseKind'));
    setErr(null); setBusy(true);
    try {
      await signUpTourist({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
      });
      let avatarUrl: string | null = null;
      if (photo) {
        avatarUrl = await uploadImage('avatar', photo, `avatar-${Date.now()}.jpg`);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('profiles').update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          avatar_url: avatarUrl,
          user_kind: kind,
          currency: kind === 'tourist' ? currency : 'JOD',
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
        if (error) throw error;
      }
      router.replace('/(tabs)/map');
    } catch (e: any) {
      const m = String(e?.message ?? '');
      setErr(m.includes('duplicate') || m.includes('already') ? t('auth.taken') : m);
    } finally {
      setBusy(false);
    }
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
          <View style={[s.topRow, rtl && { flexDirection: 'row-reverse' }]}>
            <Pressable
              onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
              style={s.back}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <ArrowLeft color="#fff" size={20} style={rtl ? { transform: [{ scaleX: -1 }] } : undefined} />
            </Pressable>
            <View style={[s.dots, rtl && { flexDirection: 'row-reverse' }]}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={[s.dot, n <= step && s.dotOn]} />
              ))}
            </View>
            <View style={{ width: 44 }} />
          </View>
          <View style={s.card}>
            {step === 1 ? (
              <>
                <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>{t('auth.register')}</Text>
                <Text style={[s.sub, { textAlign: rtl ? 'right' : 'left' }]}>1/3 · {t('auth.email')}</Text>
                <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />
                <Field label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry />
                {err ? <ErrorState message={err} /> : null}
                <PrimaryButton title={t('common.next')} onPress={next1} />
                <Link href="/(auth)/login" style={s.switch}>{t('auth.haveAccount')}</Link>
              </>
            ) : step === 2 ? (
              <>
                <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>{t('auth.register')}</Text>
                <Text style={[s.sub, { textAlign: rtl ? 'right' : 'left' }]}>2/3 · {t('profile.edit')}</Text>
                <View style={s.photoCenter}>
                  <View>
                    <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={t('auth.changePhoto')}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={s.photoBig} contentFit="cover" cachePolicy="memory-disk" />
                      ) : (
                        <View style={[s.photoBig, s.photoEmpty]}>
                          <Text style={s.plusTxt}>+</Text>
                        </View>
                      )}
                    </Pressable>
                    {photo ? (
                      <Pressable onPress={() => setPhoto(null)} style={s.xBadge} accessibilityRole="button" accessibilityLabel={t('form.remove')}>
                        <Text style={s.xTxt}>×</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Field label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} />
                <Field label={t('auth.lastName')} value={lastName} onChangeText={setLastName} />
                <Field label={t('auth.username')} value={username} onChangeText={setUsername} autoCapitalize="none" />
                {err ? <ErrorState message={err} /> : null}
                <PrimaryButton title={t('common.next')} onPress={next2} />
              </>
            ) : (
              <>
                <Text style={[s.title, { textAlign: rtl ? 'right' : 'left' }]}>3/3</Text>
                <Text style={[s.sub, { textAlign: rtl ? 'right' : 'left' }]}>{t('auth.register')}</Text>
                <Pressable
                  onPress={() => setKind('citizen')}
                  style={[s.kind, kind === 'citizen' && s.kindOn]}
                  accessibilityRole="button"
                >
                  <KindArt kind="citizen" />
                  <Text style={s.kindTxt}>{t('auth.citizen')}</Text>
                  {kind === 'citizen' ? <Text style={s.kindCheck}>✓</Text> : null}
                </Pressable>
                <Pressable
                  onPress={() => setKind('tourist')}
                  style={[s.kind, kind === 'tourist' && s.kindOn]}
                  accessibilityRole="button"
                >
                  <KindArt kind="tourist" />
                  <Text style={s.kindTxt}>{t('auth.tourist')}</Text>
                  {kind === 'tourist' ? <Text style={s.kindCheck}>✓</Text> : null}
                </Pressable>
                {kind === 'tourist' ? (
                  <View style={s.curRow}>
                    {CURRENCIES.map((c) => (
                      <Pressable
                        key={c.code}
                        onPress={() => setCurrency(c.code)}
                        style={[s.cur, currency === c.code && s.curOn]}
                        accessibilityRole="button"
                        accessibilityLabel={`${c.code}`}
                      >
                        <Text style={[s.curTxt, currency === c.code && s.curTxtOn]}>{c.symbol} {c.code}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {err ? <ErrorState message={err} /> : null}
                <View style={{ height: 12 }} />
                <PrimaryButton title={busy ? '…' : t('auth.register')} onPress={finish} disabled={busy} />
              </>
            )}
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  back: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 26, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { backgroundColor: '#fff' },
  card: {
    backgroundColor: 'rgba(250,250,247,0.98)', borderRadius: 24, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 28, elevation: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  sub: { color: COLORS.secondaryText, marginTop: 2, marginBottom: 16, fontSize: 14 },
  switch: { marginTop: 16, color: COLORS.primaryDark, fontWeight: '700', textAlign: 'center', fontSize: 15 },
  photoCenter: { alignItems: 'center', marginBottom: 14 },
  photoBig: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.softGreen },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed' },
  plusTxt: { fontSize: 42, fontWeight: '700', color: COLORS.primaryDark },
  xBadge: {
    position: 'absolute', top: -2, right: -2, width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  xTxt: { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 20 },
  kind: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10,
  },
  kindOn: { borderColor: COLORS.primary, backgroundColor: COLORS.softGreen },
  kindImg: { width: 56, height: 56, borderRadius: 28 },
  curRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  cur: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  curOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  curTxt: { fontWeight: '800', color: COLORS.text, fontSize: 14 },
  curTxtOn: { color: '#fff' },
  kindTxt: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.text },
  kindCheck: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 20 },
});
