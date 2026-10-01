import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { getMyRole } from '../../lib/auth';
import { COLORS } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';

/** Normal admin sees own logs; boss sees all (enforced by RLS + RPC). */
export default function ActivityLogs() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const role = await getMyRole();
      let q = supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (role !== 'boss_admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) q = q.eq('admin_user_id', user.id);
      }
      const { data } = await q;
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.activity')} />
      {rows.length === 0 ? <EmptyState /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>{item.action} · {item.entity_type}</Text>
              <Text style={s.muted}>{item.admin_name_snapshot} · {item.entity_name ?? ''}</Text>
              <Text style={s.muted}>{item.created_at}</Text>
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
});
