import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';

export default function DiscountsScreen() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('pricing_rules').select('*, services(name_en)').limit(200);
      setRules(data ?? []);
      setLoading(false);
    })();
  }, []);
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.discounts')} />
      <Text style={s.sub}>Smart capacity pricing + nearby support rules per service. Edit thresholds in Supabase or extend this screen.</Text>
      {rules.length === 0 ? <EmptyState /> : (
        <FlatList data={rules} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>{(item.services as any)?.name_en ?? item.service_id.slice(0, 8)}</Text>
              <Text style={s.muted}>Max +{item.max_increase_percentage}% · Support {item.support_discount_enabled ? `${item.maximum_support_discount_percentage}% / ${item.maximum_support_radius_km}km` : 'off'}</Text>
              <Text style={s.muted}>Target {item.minimum_target_capacity_percentage}-{item.maximum_target_capacity_percentage}% · Stack {item.allow_discount_stacking ? 'yes' : 'no'}</Text>
            </View>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  sub: { color: COLORS.secondaryText, paddingHorizontal: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 12 },
});
