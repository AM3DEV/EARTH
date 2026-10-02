import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useAuth';
import { COLORS, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';

export default function ProfileTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, reload } = useProfile();

  // Refresh when returning from Edit Profile so the new photo/name shows immediately.
  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const Row = ({ label, href }: { label: string; href: string }) => (
    <Pressable onPress={() => router.push(href as any)} style={s.row}>
      <Text style={s.rowTxt}>{label}</Text>
      <Text style={s.chev}>›</Text>
    </Pressable>
  );

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <Card>
        <View style={s.head}>
          {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={s.av} contentFit="cover" cachePolicy="memory-disk" /> : <View style={[s.av, s.avF]}><Text style={s.avT}>{(profile?.first_name?.[0] ?? '?').toUpperCase()}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{profile ? `${profile.first_name} ${profile.last_name}` : '…'}</Text>
            <Text style={s.muted}>@{profile?.username ?? '…'} · {profile?.email ?? ''}</Text>
          </View>
        </View>
      </Card>
      <View style={{ height: 12 }} />
      <Card>
        <Row label={t('profile.edit')} href="/edit-profile" />
        <Row label={t('booking.myBookings')} href="/bookings" />
        <Row label={t('favorites.title')} href="/favorites" />
        <Row label={t('notifications.title')} href="/notifications" />
        <Row label={t('settings.title')} href="/settings" />
        <Row label={t('profile.language')} href="/language" />
      </Card>
      <View style={{ height: 12 }} />
      <Pressable onPress={logout} style={s.logout}><Text style={s.logoutTxt}>{t('profile.logout')}</Text></Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  av: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.softGreen, borderWidth: 2, borderColor: COLORS.gold },
  avF: { backgroundColor: COLORS.softGreen, alignItems: 'center', justifyContent: 'center' },
  avT: { fontWeight: '800', color: COLORS.primaryDark, fontSize: 22 },
  name: { fontWeight: '800', fontSize: 17, color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderColor: COLORS.border },
  rowTxt: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  chev: { color: COLORS.secondaryText, fontSize: 18 },
  logout: { borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  logoutTxt: { color: COLORS.error, fontWeight: '700' },
});
