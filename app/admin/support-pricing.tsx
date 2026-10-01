import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';

/** Support Pricing dashboard: cards + source->target list + optional map (red source, green target). */
export default function SupportPricing() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('event_support_discounts').select('*').order('created_at', { ascending: false }).limit(200);
    setRows(data ?? []);
    const { data: ev } = await supabase.from('events').select('id,title_en,lat,lng').limit(200);
    setEvents(ev ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const active = rows.filter((r) => r.status === 'active').length;
  const pending = rows.filter((r) => r.status === 'pending_allocation').length;
  const expired = rows.filter((r) => r.status === 'expired').length;

  const setStatus = async (id: string, status: string) => {
    await supabase.rpc('admin_set_support_status', { p_id: id, p_status: status });
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
      ListHeaderComponent={
        <View>
          <AdminHeader title={t('admin.supportPricing')} />
          <View style={s.cards}>
            {[
              ['Active', active], ['Pending', pending], ['Expired', expired], ['Total', rows.length],
            ].map(([k, v]) => (
              <View key={k as string} style={s.stat}><Text style={s.statV}>{v}</Text><Text style={s.statK}>{k}</Text></View>
            ))}
          </View>
          {events.some((e) => e.lat) ? (
            <MapView style={s.map} initialRegion={{ latitude: 31.24, longitude: 36.51, latitudeDelta: 4.5, longitudeDelta: 4.5 }}>
              {rows.slice(0, 50).flatMap((r) => {
                const src = events.find((e) => e.id === r.source_event_id);
                const tgt = events.find((e) => e.id === r.target_event_id);
                const out: any[] = [];
                if (src?.lat) out.push(<Marker key={`s-${r.id}`} coordinate={{ latitude: src.lat, longitude: src.lng }} pinColor="red" title={`${src.title_en} +${r.source_price_increase_percentage}%`} />);
                if (tgt?.lat) out.push(<Marker key={`t-${r.id}`} coordinate={{ latitude: tgt.lat, longitude: tgt.lng }} pinColor="green" title={`${tgt.title_en} -${r.discount_percentage}%`} />);
                return out;
              })}
            </MapView>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.name}>{item.source_event_id.slice(0, 8)} → {item.target_event_id?.slice(0, 8) ?? 'pending'} · {item.distance_km ?? '—'} km</Text>
          <Text style={s.muted}>Cap {item.source_capacity_percentage}% · +{item.source_price_increase_percentage}% → -{item.discount_percentage}% · {item.status}</Text>
          <View style={s.row}>
            {['active', 'cancelled', 'expired'].map((st) => (
              <Pressable key={st} onPress={() => setStatus(item.id, st)}><Text style={s.act}>{st}</Text></Pressable>
            ))}
          </View>
        </View>
      )}
      ListEmptyComponent={<EmptyState message="No eligible nearby event for support discount" />}
    />
  );
}
const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  stat: { width: '48%', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 12 },
  statV: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statK: { color: COLORS.secondaryText, fontSize: 12 },
  map: { height: 220, borderRadius: RADIUS.lg, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: '#fff' },
  name: { fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: 14, marginTop: 8 },
  act: { color: COLORS.primaryDark, fontWeight: '700' },
});
