import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { getMyRole } from '../../lib/auth';
import { useTheme, Palette } from '../../lib/theme';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

/** Boss admin only: create/deactivate/reactivate admins, change roles. Deactivate preferred over delete. */
export default function Administrators() {
  const { t } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('boss_list_admins');
    setRows((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    (async () => {
      const r = await getMyRole();
      if (r !== 'boss_admin') { setMsg(t('admin.bossOnly')); setLoading(false); return; }
      load();
    })();
  }, []);

  const setRole = async (userId: string, role: string) => {
    setMsg(null);
    const { error } = await supabase.rpc('boss_set_role', { p_user_id: userId, p_role: role });
    setMsg(error ? error.message : t('admin.updated'));
    load();
  };

  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.administrators')} />
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      <FlatList data={rows} keyExtractor={(r: any) => r.user_id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={s.card}>
            <Text style={s.name}>{item.email ?? item.user_id.slice(0, 8)} · {item.role} {item.is_active === false ? t('admin.deactivated') : ''}</Text>
            <View style={s.row}>
              <Pressable onPress={() => setRole(item.user_id, 'admin')}><Text style={s.act}>{t('admin.makeAdmin')}</Text></Pressable>
              <Pressable onPress={() => setRole(item.user_id, 'boss_admin')}><Text style={s.act}>{t('admin.makeBoss')}</Text></Pressable>
              <Pressable onPress={() => setRole(item.user_id, 'user')}><Text style={s.act}>{t('admin.deactivateUser')}</Text></Pressable>
            </View>
          </View>
        )} />
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, paddingHorizontal: 16 },
  msg: { color: C.secondaryText, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', gap: 14, marginTop: 8 },
  act: { color: C.primaryDark, fontWeight: '700' },
});
