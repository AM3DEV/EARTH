import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useTheme, Palette } from '../../lib/theme';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { Card } from '../../components/ui/Card';

export default function AdminProfile() {
  const { t } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const [row, setRow] = useState<any>(null);
  const [role, setRole] = useState('');
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setRow(data);
      const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      setRole(r?.role ?? 'user');
    })();
  }, []);
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <AdminHeader title={t('admin.profile')} />
      <Card>
        <Text style={s.name}>{row ? `${row.first_name} ${row.last_name}` : '…'}</Text>
        <Text style={s.muted}>@{row?.username} · {row?.email}</Text>
        <Text style={s.muted}>{t('admin.role')}: {role}</Text>
        <Text style={s.muted}>{t('admin.created')}: {row?.created_at?.slice(0, 10)}</Text>
      </Card>
    </ScrollView>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 12 },
  name: { fontWeight: '800', fontSize: 18, color: C.text },
  muted: { color: C.secondaryText, marginTop: 2 },
});
