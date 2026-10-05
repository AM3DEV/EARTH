import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, useWindowDimensions, I18nManager } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, User, QrCode, Star, ShoppingBag, Receipt, CalendarCheck,
  Heart, Bell, Settings as SettingsIcon, Globe, ChevronRight, ChevronLeft,
  LogOut, Pencil,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useAuth';
import { getWallet } from '../../hooks/useBookings';
import { COLORS, RADIUS } from '../../constants/colors';
import { PHOTOS } from '../../constants/photos';
import { ScreenPal, useTheme } from '../../lib/theme';

function PressScale({ children, onPress, a11y, style }: { children: React.ReactNode; onPress: () => void; a11y: string; style?: any }) {
  const v = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return (
    <Pressable
      accessibilityLabel={a11y}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => { v.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { v.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      style={style}
    >
      <Animated.View style={anim}>{children}</Animated.View>
    </Pressable>
  );
}

export default function ProfileTab() {
  const { t, i18n } = useTranslation();
  const rtl = I18nManager.isRTL || i18n.language === 'ar';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 410;
  const { profile, loading, error, reload } = useProfile();
  const { pal: P } = useTheme();
  const s = React.useMemo(() => getStyles(P), [P]);
  const [points, setPoints] = React.useState<number | null>(null);

  // Refresh when returning from Edit Profile so the new photo/name shows immediately.
  useFocusEffect(React.useCallback(() => {
    reload();
    getWallet().then((w) => setPoints(w?.points ?? null)).catch(() => {});
  }, [reload]));

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const pts = points ?? 0;
  const nextReward = (Math.floor(pts / 1000) + 1) * 1000;
  const pct = Math.min(100, (pts / nextReward) * 100);
  const Chev = rtl ? ChevronLeft : ChevronRight;
  const rowDir = { flexDirection: rtl ? 'row-reverse' as const : 'row' as const };

  const rows = [
    { icon: User, label: t('profile.edit'), sub: t('menu.editSub'), href: '/edit-profile' },
    { icon: QrCode, label: t('loyalty.scanTitle'), sub: t('menu.scanSub'), href: '/scan' },
    { icon: Star, label: t('loyalty.title'), sub: t('menu.loyalSub'), href: '/loyalty' },
    { icon: ShoppingBag, label: t('store.title'), sub: t('menu.storeSub'), href: '/store' },
    { icon: Receipt, label: t('store.transactions'), sub: t('menu.transSub'), href: '/transactions' },
    { icon: CalendarCheck, label: t('booking.myBookings'), sub: t('menu.bookSub'), href: '/bookings' },
    { icon: Heart, label: t('favorites.title'), sub: t('menu.favSub'), href: '/favorites' },
    { icon: Bell, label: t('notifications.title'), sub: t('menu.notifSub'), href: '/notifications' },
    { icon: SettingsIcon, label: t('settings.title'), sub: t('menu.setSub'), href: '/settings' },
    { icon: Globe, label: t('profile.language'), sub: t('menu.langSub'), href: '/language' },
  ];

  const fullName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '';
  const initial = (profile?.first_name?.[0] ?? '?').toUpperCase();

  return (
    <ScrollView style={s.wrap} contentContainerStyle={[s.body, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* ---------- 1. WADI RUM CINEMATIC HERO ---------- */}
      <Animated.View entering={FadeIn.duration(500)}>
        <View style={s.hero}>
          <Image source={PHOTOS.wadiRum} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          <LinearGradient
            colors={['rgba(38,49,58,0.35)', 'rgba(38,49,58,0.05)', 'rgba(38,49,58,0.62)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.topRow, rowDir, { paddingTop: insets.top + 10 }]}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={s.backBtn}
            >
              {rtl
                ? <ArrowLeft size={22} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                : <ArrowLeft size={22} color="#fff" />}
            </Pressable>
          </View>
          <View style={[s.titleBox, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
            <Text style={[s.heroTitle, { textAlign: rtl ? 'right' : 'left' }]}>{t('profile.title')}</Text>
            <Text style={[s.heroSub, { textAlign: rtl ? 'right' : 'left' }]}>{t('profile.tagline')}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ---------- 2. PROFILE IDENTITY P.card ---------- */}
      <Animated.View entering={FadeInUp.delay(100).duration(450)} style={s.overlap}>
        {loading && !profile ? (
          <View style={s.card}>
            <View style={[rowDir, { alignItems: 'center', gap: 14 }]}>
              <View style={s.skAv} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={s.skLine} />
                <View style={[s.skLine, { width: '60%' }]} />
              </View>
            </View>
          </View>
        ) : error && !profile ? (
          <View style={s.card}>
            <Text style={[s.errTxt, { textAlign: rtl ? 'right' : 'left' }]}>{t('profile.loadFail')}</Text>
            <Pressable accessibilityLabel={t('profile.retry')} accessibilityRole="button" onPress={reload} style={s.retryBtn}>
              <Text style={s.retryTxt}>{t('profile.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.card}>
            <View style={wide ? [s.idRow, rowDir] : s.idCol}>
              <View style={[s.idTop, rowDir]}>
                {profile?.avatar_url
                  ? <Image source={{ uri: profile.avatar_url }} style={s.av} contentFit="cover" cachePolicy="memory-disk" />
                  : <View style={[s.av, s.avF]}><Text style={s.avT}>{initial}</Text></View>}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.name, { textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>{fullName || '…'}</Text>
                  {profile?.username ? (
                    <Text style={[s.handle, { textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>
                      @{profile.username}{profile?.email ? ` · ${profile.email}` : ''}
                    </Text>
                  ) : profile?.email ? (
                    <Text style={[s.handle, { textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>{profile.email}</Text>
                  ) : null}
                </View>
              </View>
              <PressScale a11y={t('profile.edit')} onPress={() => router.push('/edit-profile' as any)} style={wide ? undefined : s.editFull}>
                <View style={[s.editBtn, rowDir]}>
                  <Pencil size={16} color="#fff" />
                  <Text style={s.editTxt}>{t('profile.edit')}</Text>
                </View>
              </PressScale>
            </View>
          </View>
        )}
      </Animated.View>

      {/* ---------- 3. LOYALTY POINTS P.card ---------- */}
      <Animated.View entering={FadeInUp.delay(180).duration(450)}>
        <PressScale a11y={t('loyalty.title')} onPress={() => router.push('/loyalty' as any)} style={s.section}>
          <View style={s.card}>
            <Star size={96} color={P.soft} style={s.watermark} />
            <View style={[s.loyRow, rowDir]}>
              <View style={s.loyIcon}><Star size={24} color={P.terraDark} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.loyLabel, { textAlign: rtl ? 'right' : 'left' }]}>{t('loyalty.title')}</Text>
                <Text style={[s.loyPts, { textAlign: rtl ? 'right' : 'left' }]}>
                  {loading && points == null ? '…' : pts.toLocaleString('en-US')}
                </Text>
              </View>
              <View style={s.loyRight}>
                <Text style={s.loyNext} numberOfLines={1}>{t('profile.nextReward', { count: nextReward.toLocaleString('en-US') })}</Text>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${pct}%` }]} />
                </View>
              </View>
              <Chev size={20} color={P.chev} />
            </View>
          </View>
        </PressScale>
      </Animated.View>

      {/* ---------- 4. SETTINGS GROUP ---------- */}
      <Animated.View entering={FadeInUp.delay(240).duration(450)} style={s.section}>
        <View style={s.group}>
          {loading && !profile
            ? [0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[s.setRow, rowDir, i < 4 && s.divider]}>
                <View style={s.skIcon} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.skLine} />
                  <View style={[s.skLine, { width: '70%' }]} />
                </View>
              </View>
            ))
            : rows.map((r, i) => {
              const Icon = r.icon;
              return (
                <PressScale key={r.href} a11y={r.label} onPress={() => router.push(r.href as any)}>
                  <View style={[s.setRow, rowDir, i < rows.length - 1 && s.divider]}>
                    <View style={s.setIcon}><Icon size={22} color={P.terraDark} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.setTitle, { textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>{r.label}</Text>
                      <Text style={[s.setSub, { textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>{r.sub}</Text>
                    </View>
                    <Chev size={20} color={P.chev} />
                  </View>
                </PressScale>
              );
            })}
        </View>
      </Animated.View>

      {/* ---------- 5. LOGOUT ---------- */}
      <Animated.View entering={FadeInUp.delay(300).duration(450)} style={s.section}>
        <Pressable
          accessibilityLabel={t('profile.logout')}
          accessibilityRole="button"
          onPress={logout}
          style={({ pressed }) => [s.logout, pressed && s.logoutPressed, rowDir]}
        >
          <LogOut size={20} color={COLORS.error} />
          <Text style={s.logoutTxt}>{t('profile.logout')}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const getStyles = (P: ScreenPal) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: P.bg },
  body: { backgroundColor: P.bg },
  // Hero
  hero: { height: 280, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: P.ink },
  topRow: { flexDirection: 'row', paddingHorizontal: 16 },
  backBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(38,49,58,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  titleBox: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 72 },
  heroTitle: { color: '#fff', fontSize: 36, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  // Cards
  overlap: { marginTop: -56, marginHorizontal: 16 },
  section: { marginTop: 14, marginHorizontal: 16 },
  card: {
    backgroundColor: P.card, borderRadius: 24, padding: 18,
    shadowColor: P.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 3, overflow: 'hidden',
  },
  // Profile identity
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idCol: { gap: 14 },
  idTop: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  av: { width: 80, height: 80, borderRadius: 40, backgroundColor: P.soft, borderWidth: 2, borderColor: P.soft },
  avF: { alignItems: 'center', justifyContent: 'center' },
  avT: { fontWeight: '800', color: P.ink, fontSize: 30 },
  name: { fontWeight: '800', fontSize: 21, color: P.ink },
  handle: { color: P.muted, fontSize: 13, marginTop: 3 },
  editFull: { width: '100%' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: P.terra, borderRadius: 24, height: 46, paddingHorizontal: 20, flexShrink: 0,
  },
  editTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Loyalty
  watermark: { position: 'absolute', right: -14, top: -8, opacity: 0.55 },
  loyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  loyLabel: { fontSize: 13, color: P.muted, fontWeight: '600' },
  loyPts: { fontSize: 30, fontWeight: '800', color: P.ink, marginTop: 2 },
  loyRight: { width: 112, gap: 6, flexShrink: 0 },
  loyNext: { fontSize: 11, color: P.muted, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: P.terraDark },
  // Settings group
  group: {
    backgroundColor: P.card, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6,
    shadowColor: P.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, minHeight: 74 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: P.line },
  setIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  setTitle: { fontSize: 17, fontWeight: '700', color: P.ink },
  setSub: { fontSize: 13, color: P.muted, marginTop: 2 },
  // Logout
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: P.cream, borderWidth: 1.5, borderColor: COLORS.error,
    borderRadius: RADIUS.md, minHeight: 54,
  },
  logoutPressed: { backgroundColor: P.press },
  logoutTxt: { color: COLORS.error, fontWeight: '700', fontSize: 16 },
  // Skeleton + error
  skAv: { width: 80, height: 80, borderRadius: 40, backgroundColor: P.skel },
  skIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: P.skel, flexShrink: 0 },
  skLine: { height: 14, borderRadius: 7, backgroundColor: P.skel },
  errTxt: { color: P.ink, fontSize: 15, fontWeight: '600' },
  retryBtn: { marginTop: 12, backgroundColor: P.terra, borderRadius: 22, height: 44, alignItems: 'center', justifyContent: 'center' },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
