import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fetchMyNotifications, markNotificationRead } from '../lib/notifications';
import { LoadingState, EmptyState } from '../components/ui/States';
import { COLORS } from '../constants/colors';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setRows(await fetchMyNotifications()); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <LoadingState />;
  return (
    <View style={s.wrap}>
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
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  unread: { borderColor: COLORS.primary, backgroundColor: '#FFF8F4' },
  n: { fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.secondaryText, fontSize: 13, marginTop: 2 },
});
