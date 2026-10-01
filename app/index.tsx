import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      const v = await AsyncStorage.getItem('jg.onboarded');
      setSeen(v === '1');
      // Splash minimum display
      setTimeout(() => setReady(true), 900);
    })();
  }, []);

  if (!ready || seen === null) {
    return (
      <View style={s.splash}>
        <View style={s.center}>
          <Text style={s.flag}>🇯🇴</Text>
          <Text style={s.logo}>Jordan Guide</Text>
          <Text style={s.tag}>Discover Jordan · اكتشف الأردن</Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={s.spin} />
        </View>
      </View>
    );
  }
  if (!seen) return <Redirect href="/(auth)/onboarding" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/map" />;
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  flag: { fontSize: 72, textAlign: 'center' },
  logo: { fontSize: 32, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginTop: 12 },
  tag: { fontSize: 15, color: COLORS.secondaryText, textAlign: 'center', marginTop: 6 },
  spin: { marginTop: 28 },
});
