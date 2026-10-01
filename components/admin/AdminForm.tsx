import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Field } from '../ui/Field';
import { PrimaryButton } from '../ui/Buttons';
import { COLORS } from '../../constants/colors';

export type FieldDef = { key: string; label: string; multiline?: boolean; numeric?: boolean; placeholder?: string };

/** Generic admin create/edit form to keep CRUD consistent. */
export function AdminForm({ title, fields, initial, onSubmit }: {
  title: string; fields: FieldDef[]; initial: Record<string, any>; onSubmit: (v: Record<string, any>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [v, setV] = useState<Record<string, any>>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setErr(null); setBusy(true);
    try { await onSubmit(v); router.back(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{title}</Text>
      {fields.map((f) => (
        <Field key={f.key} label={f.label} value={String(v[f.key] ?? '')} placeholder={f.placeholder}
          multiline={f.multiline} keyboardType={f.numeric ? 'numeric' : 'default'}
          onChangeText={(txt) => setV({ ...v, [f.key]: f.numeric ? Number(txt) || 0 : txt })} />
      ))}
      {err ? <Text style={s.err}>{err}</Text> : null}
      <PrimaryButton title={busy ? '…' : t('common.save')} onPress={go} disabled={busy} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  err: { color: COLORS.error, marginBottom: 8 },
});
