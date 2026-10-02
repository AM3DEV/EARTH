import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { friendlyDbError } from '../../components/admin/fields';
import { formatMoney } from '../../lib/pricing';

export default function AdminBookings() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const { error } = await supabase.rpc('admin_set_booking_status', { p_booking_id: id, p_status: status });
    if (!error) load();
    else setError(friendlyDbError(error));
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
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.bookings')} />
      {rows.length === 0 ? <EmptyState message="No bookings yet" /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.ref}>{item.booking_reference} · {item.status}</Text>
              <Text style={s.name}>
                {(item.services as any)?.name_en ?? 'Service'} · {item.customer ? `${item.customer.first_name} ${item.customer.last_name} (@${item.customer.username})` : item.user_id.slice(0, 8)}
              </Text>
              <Text style={s.muted}>Base {formatMoney(item.base_price, item.currency)} · +{item.price_increase_percentage ?? 0}% · -{formatMoney(item.support_discount_amount ?? 0, item.currency)} · Final {formatMoney(item.final_price, item.currency)}</Text>
              <Text style={s.muted}>Cap {item.capacity_percentage ?? '—'}% · Qty {item.quantity} · {item.booking_date.slice(0, 10)}</Text>
              <View style={s.row}>
                {['confirmed', 'rejected', 'cancelled', 'completed'].map((st) => (
                  <Pressable key={st} onPress={() => setStatus(item.id, st)}><Text style={s.act}>{st}</Text></Pressable>
                ))}
              </View>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  ref: { fontWeight: '800', color: COLORS.text },
  name: { fontWeight: '600', color: COLORS.text, fontSize: 13, marginTop: 2 },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  act: { color: COLORS.primaryDark, fontWeight: '700' },
});
