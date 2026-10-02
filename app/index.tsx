import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { SPLASH_BG } from '../constants/photos';

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
      setTimeout(() => setReady(true), 1400);
    })();
  }, []);

  if (!ready || seen === null) {
    return (
      <View style={s.splash}>
        <Image source={SPLASH_BG} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(43,26,18,0.15)', 'rgba(43,26,18,0.78)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.center}>
          <Text style={s.flag}>🇯🇴</Text>
          <Text style={s.logo}>Jordan</Text>
          <Text style={s.rule}>━━━</Text>
          <Text style={s.tag}>TOURISM GUIDE · دليل السياحة</Text>
          <ActivityIndicator size="large" color="#FFFFFF" style={s.spin} />
        </View>
      </View>
    );
  }
  if (!seen) return <Redirect href="/(auth)/onboarding" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/map" />;
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#2B1A12', alignItems: 'center', justifyContent: 'flex-end' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 110 },
  flag: { fontSize: 56 },
  logo: {
    fontSize: 64, fontWeight: '800', color: '#FFFFFF', letterSpacing: 4,
    marginTop: 8, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  rule: { color: '#D6A83A', fontSize: 14, letterSpacing: 6, marginTop: 6 },
  tag: { fontSize: 13, fontWeight: '700', letterSpacing: 2.5, color: 'rgba(255,255,255,0.92)', marginTop: 10, textAlign: 'center' },
  spin: { marginTop: 30 },
});
