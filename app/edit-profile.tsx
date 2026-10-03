import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useAuth';
import { Field } from '../components/ui/Field';
import { PrimaryButton } from '../components/ui/Buttons';
import { pickImage, uploadImage } from '../lib/storage';
import { COLORS, RADIUS } from '../constants/colors';

export default function EditProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useProfile();
  const [f, setF] = useState({ first_name: '', last_name: '', username: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setF({ first_name: profile.first_name ?? '', last_name: profile.last_name ?? '', username: profile.username ?? '' });
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const preview = localUri ?? avatarUrl;

  const changePhoto = async () => {
    setMsg(null);
    try {
      const uri = await pickImage();
      if (uri) setLocalUri(uri);
    } catch (e: any) { setMsg(e.message === 'Photo permission denied' ? t('form.photoDenied') : e.message); }
  };

  const save = async () => {
    setMsg(null); setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      let url = avatarUrl;
      if (localUri) {
        const ext = (localUri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
        url = await uploadImage('avatar', localUri, `${user.id}.${ext}`);
      }
      const { error } = await supabase.from('profiles').update({
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim(),
        username: f.username.trim(),
        avatar_url: url,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;
      router.back();
    } catch (e: any) {
      const m = String(e?.message ?? '');
      setMsg(
        m.includes('Not authenticated') ? t('common.notAuth')
        : m.includes('Image too large') ? t('form.tooBig')
        : m.includes('Could not read the picked image') ? t('form.unreadable')
        : m
      );
    } finally { setBusy(false); }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{t('profile.edit')}</Text>
      <View style={s.avatarRow}>
        {preview ? (
          <Image source={{ uri: preview }} style={s.avatar} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarTxt}>{(f.first_name?.[0] ?? '?').toUpperCase()}</Text>
          </View>
        )}
        <Pressable onPress={changePhoto} disabled={busy} style={s.photoBtn} accessibilityRole="button" accessibilityLabel={t('auth.changePhoto')}>
          {busy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.photoTxt}>{t('auth.changePhoto')}</Text>}
        </Pressable>
      </View>
      <Field label={t('auth.firstName')} value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} />
      <Field label={t('auth.lastName')} value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} />
      <Field label={t('auth.username')} value={f.username} onChangeText={(v) => setF({ ...f, username: v })} autoCapitalize="none" />
      {msg ? <Text style={s.err}>{msg}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={save} disabled={busy} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  avatarRow: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#eee', borderWidth: 1, borderColor: COLORS.border },
  avatarFallback: { backgroundColor: COLORS.softGreen, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '800', color: COLORS.primaryDark, fontSize: 32 },
  photoBtn: { marginTop: 10, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  photoTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  err: { color: COLORS.error, marginBottom: 8 },
});
