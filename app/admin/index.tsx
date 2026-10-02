import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { getMyRole } from '../../lib/auth';
import { LoadingState } from '../../components/ui/States';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminStats } from '../../hooks/useAdmin';
import {
  Building2, Briefcase, Tags, ClipboardList, Calculator,
  Percent, Zap, HeartHandshake, Star, History, ShieldCheck, Settings, User,
} from 'lucide-react-native';

/** Admin home: stats overview + a button grid where each section opens its own page. */
const SECTIONS = [
  { key: 'places', href: '/admin/places', icon: Building2 },
  { key: 'experiences', href: '/admin/experiences', icon: Briefcase },
  { key: 'categories', href: '/admin/categories', icon: Tags },
  { key: 'bookings', href: '/admin/bookings', icon: ClipboardList },
  { key: 'pricing', href: '/admin/pricing', icon: Calculator },
  { key: 'discounts', href: '/admin/discounts', icon: Percent },
  { key: 'promotions', href: '/admin/event-promotions', icon: Zap },
  { key: 'supportPricing', href: '/admin/support-pricing', icon: HeartHandshake },
  { key: 'reviews', href: '/admin/reviews', icon: Star },
  { key: 'activity', href: '/admin/activity', icon: History },
  { key: 'administrators', href: '/admin/administrators', icon: ShieldCheck, bossOnly: true },
  { key: 'settings', href: '/admin/settings', icon: Settings },
  { key: 'profile', href: '/admin/profile', icon: User },
] as const;

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [role, setRole] = useState<string>('admin');
  const [name, setName] = useState('Admin');
  const [gate, setGate] = useState(true);
  const { stats, loading } = useAdminStats();

  useEffect(() => {
    (async () => {
      const r = await getMyRole();
      if (r !== 'admin' && r !== 'boss_admin') { router.replace('/(tabs)/map'); return; }
      setRole(r);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle();
        if (data?.first_name) setName(data.first_name);
      }
      setGate(false);
    })();
  }, []);

  if (gate || loading) return <LoadingState />;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={[COLORS.darkestGreen, COLORS.deepGreen]} style={s.hero}>
        <Text style={s.eyebrow}>Jordan Guide · Admin</Text>
        <Text style={s.hello}>{t('auth.welcomeAdmin', { name })}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleTxt}>{role === 'boss_admin' ? 'BOSS ADMIN' : 'ADMIN'}</Text>
        </View>
      </LinearGradient>
      <View style={s.body}>
        {stats ? (
          <>
            <Text style={s.secTitle}>Overview</Text>
            <View style={s.grid}>
              {Object.entries(stats as Record<string, any>).slice(0, 8).map(([k, v]) => (
                <View key={k} style={s.stat}>
                  <Text style={s.statV}>{String(v ?? 0)}</Text>
                  <Text style={s.statK}>{k.replaceAll('_', ' ')}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={s.secTitle}>Manage</Text>
        <View style={s.grid}>
          {SECTIONS.filter((sec) => !('bossOnly' in sec && sec.bossOnly) || role === 'boss_admin').map((sec) => {
            const Icon = sec.icon;
            return (
              <Pressable
                key={sec.key}
                style={s.btn}
                onPress={() => router.push(sec.href as any)}
                accessibilityRole="button"
                accessibilityLabel={t(`admin.${sec.key}`)}
              >
                <View style={s.iconWrap}>
                  <Icon color={COLORS.primaryDark} size={24} />
                </View>
                <Text style={s.btnTxt} numberOfLines={2}>{t(`admin.${sec.key}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  hero: { padding: 20, paddingTop: 64, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.72)' },
  hello: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 4 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.gold, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8 },
  roleTxt: { color: COLORS.darkestGreen, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  body: { padding: 16 },
  secTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 12, ...SHADOW.card },
  statV: { fontSize: 22, fontWeight: '800', color: COLORS.primaryDark },
  statK: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
  btn: {
    width: '48%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    padding: 14, alignItems: 'flex-start', gap: 10, minHeight: 110, ...SHADOW.card,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.softGreen, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
});
