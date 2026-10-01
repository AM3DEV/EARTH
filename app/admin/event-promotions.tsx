import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';

export default function EventPromotions() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('event_promotions').select('*, events(title_en)').order('created_at', { ascending: false }).limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const act = async (id: string, status: string) => {
    await supabase.rpc('admin_set_promotion_status', { p_id: id, p_status: status });
    load();
  };
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.promotions')} />
      {rows.length === 0 ? <EmptyState message="No active promotion" /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>{(item.events as any)?.title_en ?? item.event_id.slice(0, 8)} · {item.plan} · {item.status} · P{item.priority}</Text>
              <Text style={s.muted}>{item.start_at?.slice(0, 10)} → {item.end_at?.slice(0, 10)}</Text>
              <View style={s.row}>
                {['active', 'scheduled', 'cancelled', 'expired'].map((st) => (
                  <Pressable key={st} onPress={() => act(item.id, st)}><Text style={s.a}>{st}</Text></Pressable>
                ))}
              </View>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 12 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  a: { color: COLORS.primaryDark, fontWeight: '700' },
});
