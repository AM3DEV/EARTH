import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking, Share, useWindowDimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, ArrowRight, Heart, Share2, MapPin, Navigation,
  Ticket, Users, Minus, Plus, X, Phone, Globe, Building2,
} from 'lucide-react-native';
import MapView, { Marker } from '../../components/maps/NativeMap';
import { supabase } from '../../lib/supabase';
import { RADIUS } from '../../constants/colors';
import { fallbackPhoto } from '../../constants/photos';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Stars } from '../../components/ui/Card';
import { PhotoSlider } from '../../components/cards/Cards';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { usePrice } from '../../lib/currency';
import { useAutoTranslation } from '../../lib/translate';
import { useTheme, ScreenPal } from '../../lib/theme';
import { ReviewsSection } from '../../components/reviews/ReviewsSection';
import { useFavorites } from '../../hooks/useFavorites';

export default function CompanyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = lang === 'ar';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pal: P } = useTheme();
  const s = React.useMemo(() => getStyles(P), [P]);
  const [row, setRow] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { rows: favs, toggle } = useFavorites();
  // Responsive hero: ~30% of screen height, clamped for small and large screens.
  const { height: WH } = useWindowDimensions();
  const coverH = Math.min(320, Math.max(200, Math.round(WH * 0.3)));
  const { fmt } = usePrice();

  // Booking bottom sheet state (real service data — date + people prefill /booking/new).
  const [sheetSv, setSheetSv] = useState<any>(null);
  const [sheetDate, setSheetDate] = useState(new Date().toISOString().slice(0, 10));
  const [sheetQty, setSheetQty] = useState(2);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
    setRow(data);
    if (data) {
      // All services, bookable first.
      const { data: sv } = await supabase.from('services').select('*').eq('company_id', data.id).order('available', { ascending: false });
      setServices(sv ?? []);
      // Sub-companies (branches) of this company.
      const { data: br } = await supabase.from('companies').select('id,name_en,name_ar,description_en,description_ar,logo_url,cover_url,location').eq('parent_company_id', data.id).eq('active', true).order('name_en');
      setBranches(br ?? []);
    }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  // Refresh on return (new review updates the header rating via trigger).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Next 5 days for the sheet date strip.
  const days = React.useMemo(() => {
    const out: { iso: string; dow: string; num: string }[] = [];
    const loc = lang === 'ar' ? 'ar-JO' : 'en-GB';
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dow: d.toLocaleDateString(loc, { weekday: 'short' }),
        num: String(d.getDate()),
      });
    }
    return out;
  }, [lang]);

  // Base description (stored ar/en columns) + auto-translation for other languages.
  const baseDesc = lang === 'ar' ? row?.description_ar : row?.description_en;
  const { text: autoDesc } = useAutoTranslation('company', row?.id, baseDesc ?? '', lang);

  if (loading) return <LoadingState />;
  if (!row) return <ErrorState message={t('common.error')} onRetry={() => router.back()} />;

  const name = lang === 'ar' ? row.name_ar : row.name_en;
  const desc = autoDesc || baseDesc;
  const isFav = (favs ?? []).some((f: any) => f.target_type === 'company' && f.target_id === row.id);
  const pics = [row.cover_url, ...(row.gallery_urls ?? [])].filter(Boolean);
  const avail = services.filter((x) => x.available);
  const featured = avail[0] ?? null;
  const dir: any = { flexDirection: rtl ? 'row-reverse' : 'row' };

  const openSheet = (sv: any) => {
    setSheetSv(sv);
    setSheetDate(new Date().toISOString().slice(0, 10));
    setSheetQty(2);
  };

  const svName = (sv: any) => (lang === 'ar' ? sv.name_ar : sv.name_en) ?? name;
  const unit = (sv: any) => Number(sv?.current_price ?? 0);
  const cur = Number(sheetSv?.current_booking ?? 0);
  const max = Number(sheetSv?.max_booking ?? 0);
  const left = max > 0 ? max - cur : 999;
  const qty = Math.min(Math.max(1, sheetQty), 999);
  const total = unit(sheetSv) * qty;
  let reason: string | null = null;
  if (sheetSv && !sheetSv.available) reason = t('booking.unavailable');

  const confirmSheet = () => {
    if (!sheetSv || reason) return;
    setSheetSv(null);
    router.push(`/booking/new?service_id=${sheetSv.id}&date=${encodeURIComponent(sheetDate)}&qty=${qty}` as any);
  };

  const contactBtn = (icon: React.ReactNode, label: string, onPress: () => void, a11y: string) => (
    <Pressable key={a11y} onPress={onPress} style={({ pressed }) => [s.actBtn, pressed && s.pressed]} accessibilityRole="button" accessibilityLabel={a11y}>
      {icon}
      <Text style={s.actTxt}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={s.wrap}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: featured ? 120 : 40 }} showsVerticalScrollIndicator={false}>
        {/* ---------- 1. HERO ---------- */}
        <View style={[s.heroWrap, { marginTop: insets.top + 8 }]}>
          <View style={[s.heroClip, { height: coverH }]}>
            <PhotoSlider urls={pics.length > 0 ? pics : [fallbackPhoto(row.id)]} height={coverH} />
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[s.fabBack, rtl ? { right: 12 } : { left: 12 }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            {rtl ? <ArrowRight color="#26313A" size={20} /> : <ArrowLeft color="#26313A" size={20} />}
          </Pressable>
          <View style={[s.fabRight, rtl ? { left: 12 } : { right: 12 }]}>
            <Pressable
              onPress={() => toggle('company', row.id)}
              style={s.fabBtn}
              accessibilityRole="button"
              accessibilityLabel={t('detail.favorite')}
            >
              <Heart size={20} color={isFav ? '#E74752' : '#26313A'} fill={isFav ? '#E74752' : 'none'} />
            </Pressable>
            <Pressable
              onPress={() => Share.share({ message: name })}
              style={s.fabBtn}
              accessibilityRole="button"
              accessibilityLabel={t('detail.share')}
            >
              <Share2 size={20} color="#26313A" />
            </Pressable>
          </View>
        </View>

        {/* ---------- 2. COMPANY INFO ---------- */}
        <View style={s.card}>
          <View style={[s.nameRow, dir]}>
            <Text style={s.name}>{name}</Text>
            {row.verified ? <VerifiedBadge /> : null}
          </View>
          <View style={[s.rateRow, dir]}>
            {row.avg_rating ?? row.rating
              ? <Stars value={row.avg_rating ?? row.rating} />
              : <Text style={s.muted}>{t('map.noReviews')}</Text>}
          </View>
          {row.location ? (
            <View style={[s.locRow, dir]}>
              <MapPin size={15} color={P.terraDark} />
              <Text style={s.locTxt}>{row.location}</Text>
            </View>
          ) : null}
          {row.price != null ? (
            <View style={[s.locRow, dir]}>
              <Ticket size={15} color={P.terraDark} />
              <Text style={s.locTxt}>{fmt(Number(row.price), row.currency ?? 'JOD')} · {t('detail.tourist')}</Text>
            </View>
          ) : null}
          {row.citizen_price != null ? (
            <View style={[s.locRow, dir]}>
              <Ticket size={15} color={P.terraDark} />
              <Text style={s.locTxt}>{fmt(Number(row.citizen_price), row.currency ?? 'JOD')} · {t('detail.citizen')}</Text>
            </View>
          ) : null}
          {desc ? <Text style={s.desc}>{desc}</Text> : null}
          <View style={s.actions}>
            {contactBtn(
              <Heart size={17} color={isFav ? '#E74752' : P.terraDark} fill={isFav ? '#E74752' : 'none'} />,
              t('detail.favorite'), () => toggle('company', row.id), t('detail.favorite'),
            )}
            {contactBtn(<Share2 size={17} color={P.terraDark} />, t('detail.share'), () => Share.share({ message: name }), t('detail.share'))}
            {row.phone ? contactBtn(<Phone size={17} color={P.terraDark} />, t('detail.call'), () => Linking.openURL(`tel:${row.phone}`), t('detail.call')) : null}
            {row.website ? contactBtn(<Globe size={17} color={P.terraDark} />, t('detail.website'), () => Linking.openURL(row.website), t('detail.website')) : null}
          </View>
        </View>

        {/* ---------- 3. FEATURED SERVICE ---------- */}
        {featured ? (
          <View style={s.card}>
            <View style={[s.featTop, dir]}>
              <View style={s.featIcon}><Ticket size={22} color={P.terraDark} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.featName} numberOfLines={1}>{svName(featured)}</Text>
                <Text style={s.muted}>
                  {fmt(unit(featured), featured.currency)} · {featured.current_booking}/{featured.max_booking}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => openSheet(featured)}
              style={({ pressed }) => [s.bookBtn, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('detail.book')}
            >
              <Text style={s.bookTxt}>{t('detail.book')} →</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ---------- 4. LOCATION ---------- */}
        {row.lat && row.lng ? (
          <View style={s.card}>
            <View style={s.mapClip}>
              <MapView
                style={{ height: 180 }}
                initialRegion={{ latitude: row.lat, longitude: row.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                scrollEnabled={false}
              >
                <Marker coordinate={{ latitude: row.lat, longitude: row.lng }} />
              </MapView>
            </View>
            <Pressable
              style={({ pressed }) => [s.dirBtn, pressed && s.pressed]}
              onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}`)}
              accessibilityRole="button"
              accessibilityLabel={t('detail.directions')}
            >
              <MapPin size={17} color={P.terraDark} />
              <Text style={s.dirTxt}>{t('detail.directions')}</Text>
              <Text style={s.dirChev}>›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ---------- 5. ALL SERVICES ---------- */}
        <View style={s.secHead}>
          <Text style={s.sec}>{t('detail.services')}</Text>
        </View>
        {services.map((sv) => {
          const off = !sv.available;
          return (
            <View key={sv.id} style={[s.card, s.svCard, off && s.svOff]}>
              <View style={[s.svTop, dir]}>
                <View style={s.svIcon}><Ticket size={20} color={P.terraDark} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.svName} numberOfLines={1}>{svName(sv)}</Text>
                  <Text style={s.muted}>{fmt(Number(sv.current_price), sv.currency)} · {sv.current_booking}/{sv.max_booking}</Text>
                </View>
              </View>
              <View style={[s.svBtns, dir]}>
                <Pressable
                  onPress={() => router.push(`/service/${sv.id}` as any)}
                  style={({ pressed }) => [s.ghostBtn, pressed && s.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={s.ghostTxt}>{t('detail.description')} ›</Text>
                </Pressable>
                {off ? (
                  <Text style={s.off}>{t('common.inactive')}</Text>
                ) : (
                  <Pressable
                    onPress={() => openSheet(sv)}
                    style={({ pressed }) => [s.smallBook, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t('detail.book')}
                  >
                    <Text style={s.smallBookTxt}>{t('detail.book')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
        {services.length === 0 ? <Text style={[s.muted, s.padH]}>{t('detail.noServices')}</Text> : null}

        {/* ---------- BRANCHES (sub-companies) ---------- */}
        {branches.length > 0 ? (
          <>
            <View style={s.secHead}>
              <Text style={s.sec}>{t('detail.branches')}</Text>
            </View>
            {branches.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => router.push(`/company/${b.id}` as any)}
                style={({ pressed }) => [s.card, s.svCard, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={lang === 'ar' ? b.name_ar : b.name_en}
              >
                <View style={[s.svTop, dir]}>
                  <View style={s.svIcon}><Building2 size={20} color={P.terraDark} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.svName} numberOfLines={1}>{lang === 'ar' ? b.name_ar : b.name_en}</Text>
                    {(lang === 'ar' ? b.description_ar : b.description_en) ? (
                      <Text style={s.muted} numberOfLines={2}>{lang === 'ar' ? b.description_ar : b.description_en}</Text>
                    ) : b.location ? (
                      <Text style={s.muted} numberOfLines={1}>{b.location}</Text>
                    ) : null}
                  </View>
                  <Text style={s.dirChev}>›</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {/* ---------- 6+7. REVIEWS (list + write form from the shared section) ---------- */}
        <View style={s.padH}>
          <ReviewsSection targetType="company" targetId={row.id} />
        </View>
      </ScrollView>

      {/* ---------- 12. STICKY BOOK NOW ---------- */}
      {featured ? (
        <View style={[s.sticky, { paddingBottom: 12 + insets.bottom }]}>
          <View style={s.stickyIn}>
            <View>
              <Text style={s.stickyFrom}>{fmt(unit(featured), featured.currency)}</Text>
              <Text style={s.stickySub} numberOfLines={1}>{svName(featured)}</Text>
            </View>
            <Pressable
              onPress={() => openSheet(featured)}
              style={({ pressed }) => [s.stickyBtn, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('detail.book')}
            >
              <Text style={s.stickyBtnTxt}>{t('detail.book')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ---------- 8–11. BOOKING SHEET ---------- */}
      <Modal visible={!!sheetSv} transparent animationType="slide" onRequestClose={() => setSheetSv(null)}>
        <Pressable style={s.sheetBg} onPress={() => setSheetSv(null)}>
          <View style={s.sheet}>
            <View style={[s.sheetHead, dir]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetName} numberOfLines={1}>{sheetSv ? svName(sheetSv) : ''}</Text>
                <Text style={s.sheetSub}>{t('sheet.title')}</Text>
              </View>
              <Pressable onPress={() => setSheetSv(null)} style={s.sheetX} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <X size={20} color={P.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.sheetLabel}>{t('sheet.date')}</Text>
              <View style={[s.dayRow, dir]}>
                {days.map((d) => {
                  const on = sheetDate === d.iso;
                  return (
                    <Pressable
                      key={d.iso}
                      onPress={() => setSheetDate(d.iso)}
                      style={[s.day, on && s.dayOn]}
                      accessibilityRole="button"
                      accessibilityLabel={d.iso}
                    >
                      <Text style={[s.dayDow, on && s.dayTxtOn]}>{d.dow}</Text>
                      <Text style={[s.dayNum, on && s.dayTxtOn]}>{d.num}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.sheetLabel}>{t('sheet.people')}</Text>
              <View style={[s.stepRow, dir]}>
                <Pressable
                  onPress={() => setSheetQty((q) => Math.max(1, q - 1))}
                  style={s.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="−"
                >
                  <Minus size={18} color={P.terraDark} />
                </Pressable>
                <View style={s.stepMid}>
                  <Users size={16} color={P.muted} />
                  <Text style={s.stepTxt}>{qty} {t('sheet.people')}</Text>
                </View>
                <Pressable
                  onPress={() => setSheetQty((q) => Math.min(Math.max(1, left), q + 1))}
                  style={s.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="+"
                >
                  <Plus size={18} color={P.terraDark} />
                </Pressable>
              </View>

              <View style={s.sumBox}>
                <View style={[s.sumRow, dir]}>
                  <Text style={s.sumKey} numberOfLines={1}>{sheetSv ? svName(sheetSv) : ''}</Text>
                  <Text style={s.sumVal}>{sheetSv ? fmt(unit(sheetSv), sheetSv.currency) : ''}</Text>
                </View>
                <View style={[s.sumRow, dir]}>
                  <Text style={s.sumKey}>{t('booking.quantity')}</Text>
                  <Text style={s.sumVal}>{qty}</Text>
                </View>
                <View style={[s.sumRow, s.sumTotal, dir]}>
                  <Text style={s.sumTotalKey}>{t('sheet.total')}</Text>
                  <Text style={s.sumTotalVal}>{sheetSv ? fmt(total, sheetSv.currency) : ''}</Text>
                </View>
              </View>
              {reason ? <Text style={s.reason}>{reason}</Text> : null}
              {sheetSv && max > 0 && left > 0 ? (
                <Text style={s.leftTxt}>{t('booking.onlyLeft', { count: left })}</Text>
              ) : null}

              <Pressable
                onPress={confirmSheet}
                disabled={!!reason}
                style={({ pressed }) => [s.confirm, !!reason && s.confirmOff, pressed && !reason && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('booking.confirm')}
              >
                <Text style={s.confirmTxt}>
                  {t('booking.confirm')}{sheetSv ? ` — ${fmt(total, sheetSv.currency)}` : ''}
                </Text>
              </Pressable>
              <View style={{ height: 8 + insets.bottom }} />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (P: ScreenPal) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: P.bg },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  muted: { color: P.muted, fontSize: 13, marginTop: 3 },
  padH: { paddingHorizontal: 16 },
  // Hero
  heroWrap: { paddingHorizontal: 16 },
  heroClip: { borderRadius: 24, overflow: 'hidden', backgroundColor: P.skel },
  fabBack: {
    position: 'absolute', top: 12, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  fabBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  fabRight: { position: 'absolute', top: 12, flexDirection: 'row', gap: 8, zIndex: 10 },
  // Cards
  card: {
    backgroundColor: P.card, borderRadius: 24, padding: 18, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: P.line,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 24, fontWeight: '800', color: P.ink },
  rateRow: { marginTop: 6 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locTxt: { color: P.muted, fontSize: 13, flexShrink: 1 },
  desc: { marginTop: 10, fontSize: 15, lineHeight: 22, color: P.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  actBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: P.line, borderRadius: 16, minHeight: 44, paddingHorizontal: 14,
    backgroundColor: P.card,
  },
  actTxt: { fontWeight: '700', color: P.terraDark, fontSize: 14 },
  // Featured service
  featTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featName: { fontWeight: '800', fontSize: 17, color: P.ink },
  bookBtn: { backgroundColor: P.terra, borderRadius: 18, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  bookTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  // Map
  mapClip: { borderRadius: 20, overflow: 'hidden' },
  dirBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: P.line, borderRadius: 16, minHeight: 50, paddingHorizontal: 14, marginTop: 12,
  },
  dirTxt: { flex: 1, fontWeight: '700', color: P.ink, fontSize: 15 },
  dirChev: { color: P.muted, fontSize: 20 },
  // Services
  secHead: { paddingHorizontal: 16, marginTop: 20, marginBottom: 2 },
  sec: { fontSize: 19, fontWeight: '800', color: P.ink },
  svCard: { padding: 16 },
  svOff: { opacity: 0.65 },
  svTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  svIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  svName: { fontWeight: '700', color: P.ink, fontSize: 15 },
  svBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  ghostBtn: { borderWidth: 1, borderColor: P.line, borderRadius: 14, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { fontWeight: '700', color: P.terraDark, fontSize: 14 },
  smallBook: { backgroundColor: P.terra, borderRadius: 14, minHeight: 44, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  smallBookTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  off: { color: '#E74752', fontWeight: '700', fontSize: 13 },
  // Sticky CTA
  sticky: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: P.card, borderTopWidth: 1, borderTopColor: P.line,
    paddingHorizontal: 16, paddingTop: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 8,
  },
  stickyIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stickyFrom: { fontWeight: '800', fontSize: 19, color: P.ink },
  stickySub: { color: P.muted, fontSize: 12, maxWidth: 180 },
  stickyBtn: { backgroundColor: P.terra, borderRadius: 18, minHeight: 54, paddingHorizontal: 42, alignItems: 'center', justifyContent: 'center' },
  stickyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  // Sheet
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sheetName: { fontWeight: '800', fontSize: 18, color: P.ink },
  sheetSub: { color: P.muted, fontSize: 13, marginTop: 2 },
  sheetX: { width: 38, height: 38, borderRadius: 19, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: P.muted, marginTop: 8, marginBottom: 8 },
  dayRow: { flexDirection: 'row', gap: 8 },
  day: { flex: 1, borderWidth: 1, borderColor: P.line, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: P.card },
  dayOn: { backgroundColor: P.terra, borderColor: P.terra },
  dayDow: { fontSize: 12, fontWeight: '600', color: P.muted },
  dayNum: { fontSize: 17, fontWeight: '800', color: P.ink, marginTop: 2 },
  dayTxtOn: { color: '#fff' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  stepMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: P.line, borderRadius: 16, minHeight: 52 },
  stepTxt: { fontWeight: '800', fontSize: 16, color: P.ink },
  sumBox: { backgroundColor: P.soft, borderRadius: 18, padding: 14, marginTop: 16, gap: 8 },
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sumKey: { color: P.muted, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  sumVal: { color: P.ink, fontSize: 14, fontWeight: '700' },
  sumTotal: { borderTopWidth: 1, borderTopColor: P.line, paddingTop: 8, marginTop: 2 },
  sumTotalKey: { fontWeight: '800', fontSize: 16, color: P.ink },
  sumTotalVal: { fontWeight: '800', fontSize: 19, color: P.terraDark },
  reason: { color: '#E74752', fontWeight: '600', fontSize: 13, marginTop: 10 },
  leftTxt: { color: P.muted, fontSize: 12, marginTop: 8 },
  confirm: { backgroundColor: P.terra, borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  confirmOff: { opacity: 0.45 },
  confirmTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
