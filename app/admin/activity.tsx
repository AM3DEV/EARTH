import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getMyRole } from '../../lib/auth';
import { COLORS, RADIUS, SHADOW } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States';
import { friendlyDbError } from '../../components/admin/fields';

/** Activity timeline: every admin create/update/delete/activate + server booking & promotion events. Normal admin sees own logs; boss sees all (RLS). */
export default function ActivityLogs() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const role = await getMyRole();
      let q = supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (role !== 'boss_admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) q = q.eq('admin_user_id', user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setError(friendlyDbError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState />;

  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.activity')} />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState message="No activity yet — create, edit or deactivate something and it will appear here." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <LogRow item={item} />}
        />
      )}
    </View>
  );
}

function dotColor(action: string): string {
  const a = String(action ?? '').toLowerCase();
  if (a.includes('delete') || a.includes('reject') || a.includes('cancel')) return COLORS.error;
  if (a.includes('create') || a.includes('activate') || a.includes('confirm') || a.includes('approv')) return COLORS.success;
  if (a.includes('update') || a.includes('deactivate') || a.includes('pending') || a.includes('schedul')) return COLORS.gold;
  return COLORS.primary;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso ?? '').slice(0, 16).replace('T', ' ');
  }
}

function LogRow({ item }: { item: any }) {
  const when = fmtDate(item.created_at);
  const entity = [item.entity_type, item.entity_name].filter(Boolean).join(' · ');
  return (
    <View style={s.row}>
      <View style={s.rail}>
        <View style={[s.dot, { backgroundColor: dotColor(item.action) }]} />
        <View style={s.line} />
      </View>
      <View style={s.card}>
        <Text style={s.action}>{item.action}</Text>
        {entity ? <Text style={s.entity}>{entity}</Text> : null}
        {item.description ? <Text style={s.desc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={s.meta}>{item.admin_name_snapshot ?? 'Admin'} · {when}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  row: { flexDirection: 'row', gap: 10 },
  rail: { alignItems: 'center', paddingTop: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4, minHeight: 12 },
  card: {
    flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 12, ...SHADOW.card,
  },
  action: { fontWeight: '800', color: COLORS.text, fontSize: 15, textTransform: 'capitalize' },
  entity: { color: COLORS.primaryDark, fontWeight: '600', fontSize: 13, marginTop: 2 },
  desc: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
});
