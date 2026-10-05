import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AdminList } from '../../components/admin/AdminList';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { RADIUS } from '../../constants/colors';
import { useTheme, Palette } from '../../lib/theme';

/**
 * Experiences: Services + Events merged into ONE admin section.
 * Tabs switch the list; + Create follows the active tab.
 * Tables stay separate (bookings/promotions depend on them) — only the UI is merged.
 */
export default function AdminExperiences() {
  const { t, i18n } = useTranslation();
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const router = useRouter();
  const lang = i18n.language;
  const [tab, setTab] = useState<'services' | 'events'>('services');
  const svc = tab === 'services';

  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.experiences')} />
      <View style={s.tabsRow}>
        <View style={s.tabs}>
          <Pressable
            onPress={() => setTab('services')}
            style={[s.tab, svc && s.tabActive]}
            accessibilityRole="button"
            accessibilityLabel={t('admin.services')}
          >
            <Text style={[s.tabTxt, svc && s.tabTxtActive]}>{t('admin.services')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('events')}
            style={[s.tab, !svc && s.tabActive]}
            accessibilityRole="button"
            accessibilityLabel={t('admin.events')}
          >
            <Text style={[s.tabTxt, !svc && s.tabTxtActive]}>{t('admin.events')}</Text>
          </Pressable>
        </View>
        <Pressable
          style={s.create}
          onPress={() => router.push((svc ? '/admin/service-create' : '/admin/event-create') as any)}
        >
          <Text style={s.createT}>+ {t('common.create')}</Text>
        </Pressable>
      </View>
      {svc ? (
        <AdminList
          bare
          table="services"
          titleKey="admin.services"
          createHref="/admin/service-create"
          editBase="/admin/service-edit"
          nameOf={(r, l) => (l === 'ar' ? r.name_ar : r.name_en)}
          key={`list-services-${lang}`}
        />
      ) : (
        <AdminList
          bare
          table="events"
          titleKey="admin.events"
          createHref="/admin/event-create"
          editBase="/admin/event-edit"
          nameOf={(r, l) => (l === 'ar' ? r.title_ar : r.title_en)}
          key={`list-events-${lang}`}
        />
      )}
    </View>
  );
}

const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  tabs: { flex: 1, flexDirection: 'row', backgroundColor: C.softGreen, borderRadius: RADIUS.full, padding: 4, gap: 4 },
  tab: { flex: 1, borderRadius: RADIUS.full, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tabTxt: { fontWeight: '700', color: C.secondaryText, fontSize: 14 },
  tabTxtActive: { color: C.text },
  create: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  createT: { color: '#fff', fontWeight: '700' },
});
