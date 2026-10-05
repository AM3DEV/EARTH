import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { friendlyDbError } from '../../components/admin/fields';
import { formatMoney } from '../../lib/pricing';
import { bookingStatusKey } from '../../lib/status';

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled'] as const;

function pillColors(st: string, C: Palette): { bg: string; fg: string } {
  if (st === 'confirmed' || st === 'completed') return { bg: '#E3F3E9', fg: C.success };
  if (st === 'pending') return { bg: '#FAF0D7', fg: '#A5760A' };
  return { bg: '#FDE7E9', fg: C.error };
}

export default function AdminBookings() {
  const { t, i18n } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const lang = i18n.language;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // NOTE: bookings.user_id -> auth.users, NOT -> profiles, so profiles
      // cannot be embedded in one query. Fetch bookings, then profiles by id.
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('*, services(name_en,name_ar)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (bErr) throw bErr;
      const ids = [...new Set((bookings ?? []).map((b: any) => b.user_id))];
      let byId: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id,first_name,last_name,email,username')
          .in('id', ids);
        if (pErr) throw pErr;
        for (const p of profs ?? []) byId[p.id] = p;
      }
      setRows((bookings ?? []).map((b: any) => ({ ...b, customer: byId[b.user_id] ?? null })));
    } catch (e: any) {
      setError(friendlyDbError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (id: string, status: string) => {
    // Status change via secure RPC so audit log + notification are written server-side
    setNotice(null);
    setBusyId(id);
    try {
      const { error } = await supabase.rpc('admin_set_booking_status', { p_booking_id: id, p_status: status });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setNotice(friendlyDbError(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <View style={s.wrap}>
        <AdminHeader title={t('admin.bookings')} />
        <ErrorState message={error} onRetry={load} />
      </View>
    );
  }

  const counts: Record<string, number> = { all: rows.length };
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.bookings')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsIn}>
        {FILTERS.map((f) => {
          const on = filter === f;
          const label = f === 'all' ? t('monument.all') : (() => { const k = bookingStatusKey(f); return k ? t(k) : f; })();
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, on && s.chipOn]} accessibilityRole="button">
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{label} ({counts[f] ?? 0})</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {notice ? <Text style={s.notice}>{notice}</Text> : null}
      {shown.length === 0 ? <EmptyState message={t('booking.noBookings')} /> : (
        <FlatList data={shown} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          renderItem={({ item }) => {
            const st = String(item.status ?? '');
            const stKey = bookingStatusKey(st);
            const pc = pillColors(st, C);
            const busy = busyId === item.id;
            return (
            <View style={s.card}>
              <View style={s.top}>
                <Text style={s.ref}>{item.booking_reference}</Text>
                <Text style={[s.pill, { backgroundColor: pc.bg, color: pc.fg }]}>
                  {stKey ? t(stKey) : st}
                </Text>
              </View>
              <Text style={s.name}>
                {(lang === 'ar' ? (item.services as any)?.name_ar : (item.services as any)?.name_en) ?? t('admin.services')} · {item.customer ? `${item.customer.first_name} ${item.customer.last_name} (@${item.customer.username})` : item.user_id.slice(0, 8)}
              </Text>
              <Text style={s.muted}>{t('booking.rBase')} {formatMoney(item.base_price, item.currency)} · +{item.price_increase_percentage ?? 0}% · -{formatMoney(item.support_discount_amount ?? 0, item.currency)} · {t('booking.rFinal')} {formatMoney(item.final_price, item.currency)}</Text>
              <Text style={s.muted}>{t('booking.rCap')} {item.capacity_percentage ?? '—'}% · {t('booking.rQty')} {item.quantity} · {item.booking_date.slice(0, 10)}</Text>
              <View style={s.row}>
                {(['confirmed', 'rejected', 'cancelled', 'completed'] as const).map((st2) => {
                  const ak = bookingStatusKey(st2);
                  const current = st2 === st;
                  return (
                  <Pressable
                    key={st2}
                    onPress={() => { if (!current && !busy) setStatus(item.id, st2); }}
                    disabled={current || busy}
                    accessibilityRole="button"
                  >
                    <Text style={[s.act, current && s.actCur, busy && s.actBusy]}>
                      {current ? `✓ ${ak ? t(ak) : st2}` : ak ? t(ak) : st2}
                    </Text>
                  </Pressable>
                  );
                })}
                {busy ? <ActivityIndicator size="small" color={C.primary} /> : null}
              </View>
            </View>
            );
          }} />
      )}
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  chips: { maxHeight: 52, marginTop: 4 },
  chipsIn: { gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.full, paddingHorizontal: 14, height: 36, justifyContent: 'center', backgroundColor: C.card },
  chipOn: { backgroundColor: C.text, borderColor: C.text },
  chipTxt: { color: C.text, fontWeight: '600' },
  chipTxtOn: { color: '#fff' },
  notice: { color: C.error, paddingHorizontal: 16, marginTop: 6, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ref: { fontWeight: '800', color: C.text, flex: 1 },
  pill: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, overflow: 'hidden' },
  name: { fontWeight: '600', color: C.text, fontSize: 13, marginTop: 2 },
  muted: { color: C.secondaryText, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
  act: { color: C.primaryDark, fontWeight: '700' },
  actCur: { color: C.success, fontWeight: '800' },
  actBusy: { opacity: 0.5 },
});
