import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useTheme, Palette } from '../../lib/theme';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState, EmptyState } from '../../components/ui/States';

export default function DiscountsScreen() {
  const { t } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
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
      <Text style={s.sub}>{t('admin.discSub')}</Text>
      {rules.length === 0 ? <EmptyState /> : (
        <FlatList data={rules} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.name}>{(item.services as any)?.name_en ?? item.service_id.slice(0, 8)}</Text>
              <Text style={s.muted}>{t('admin.wMax')} +{item.max_increase_percentage}% · {t('admin.wSupport')} {item.support_discount_enabled ? `${item.maximum_support_discount_percentage}% / ${item.maximum_support_radius_km}km` : t('common.no')}</Text>
              <Text style={s.muted}>{t('admin.wTarget')} {item.minimum_target_capacity_percentage}-{item.maximum_target_capacity_percentage}% · {t('admin.wStack')} {item.allow_discount_stacking ? t('common.yes') : t('common.no')}</Text>
            </View>
          )} />
      )}
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, paddingHorizontal: 16 },
  sub: { color: C.secondaryText, paddingHorizontal: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: C.text },
  muted: { color: C.secondaryText, fontSize: 12 },
});
