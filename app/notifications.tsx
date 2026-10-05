import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fetchMyNotifications, markNotificationRead } from '../lib/notifications';
import { LoadingState, EmptyState } from '../components/ui/States';
import { BackButton } from '../components/ui/BackButton';
import { useTheme, Palette } from '../lib/theme';

export default function NotificationsScreen() {
  const { colors: C } = useTheme();
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setRows(await fetchMyNotifications()); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const s = React.useMemo(() => getStyles(C), [C]);
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
      <BackButton />
      <Text style={s.title}>{t('notifications.title')}</Text>
      {rows.length === 0 ? <EmptyState message={t('notifications.empty')} /> : (
        <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable style={[s.card, !item.read && s.unread]} onPress={async () => { await markNotificationRead(item.id); load(); }}>
              <Text style={s.n}>{item.title}</Text>
              <Text style={s.muted}>{item.body}</Text>
            </Pressable>
          )} />
      )}
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 110 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  unread: { borderColor: C.primary, backgroundColor: C.softGreen },
  n: { fontWeight: '700', color: C.text },
  muted: { color: C.secondaryText, fontSize: 13, marginTop: 2 },
});
