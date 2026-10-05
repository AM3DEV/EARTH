import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useTheme, Palette } from '../../lib/theme';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { Field } from '../../components/ui/Field';
import { PrimaryButton } from '../../components/ui/Buttons';

export default function AdminSettings() {
  const { t } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const [rows, setRows] = useState<any[]>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('*').limit(100);
      setRows(data ?? []);
    })();
  }, []);
  const save = async () => {
    if (!key.trim()) return;
    await supabase.from('app_settings').upsert({ key: key.trim(), value: { v: value } });
    const { data } = await supabase.from('app_settings').select('*').limit(100);
    setRows(data ?? []);
    setKey(''); setValue('');
  };
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <AdminHeader title={t('admin.settings')} />
      {rows.map((r) => (
        <View key={r.key} style={s.card}><Text style={s.k}>{r.key}</Text><Text style={s.muted}>{JSON.stringify(r.value)}</Text></View>
      ))}
      <Field label={t('admin.key')} value={key} onChangeText={setKey} />
      <Field label={t('admin.value')} value={value} onChangeText={setValue} />
      <PrimaryButton title={t('common.save')} onPress={save} />
    </ScrollView>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  k: { fontWeight: '700', color: C.text },
  muted: { color: C.secondaryText, fontSize: 12 },
});
