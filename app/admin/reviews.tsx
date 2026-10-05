import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useTheme, Palette } from '../../lib/theme';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { targetKindLabel } from '../../lib/status';

export default function AdminReviews() {
  const { t } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.reviews')} />
      {rows.length === 0 ? <EmptyState message={t('admin.noReviews')} /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>★{item.rating} · {targetKindLabel(item.target_type, t)} · {item.target_id.slice(0, 8)}</Text>
              {item.comment ? <Text style={s.muted}>{item.comment}</Text> : null}
              <Pressable onPress={async () => { await supabase.from('reviews').delete().eq('id', item.id); load(); }}>
                <Text style={s.del}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          )} />
      )}
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: C.text },
  muted: { color: C.secondaryText, fontSize: 13 },
  del: { color: C.error, fontWeight: '700', marginTop: 6 },
});
