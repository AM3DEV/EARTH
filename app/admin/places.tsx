import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AdminList } from '../../components/admin/AdminList';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { COLORS, RADIUS } from '../../constants/colors';

/**
 * Places: Companies + Monuments merged into ONE admin section.
 * Tabs switch the list; + Create follows the active tab.
 * Tables stay separate (different fields) — only the UI is merged.
 */
export default function AdminPlaces() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang = i18n.language;
  const [tab, setTab] = useState<'companies' | 'monuments'>('companies');
  const comps = tab === 'companies';

  return (
    <View style={s.wrap}>
      <AdminHeader title={t('admin.places')} />
      <View style={s.tabsRow}>
        <View style={s.tabs}>
          <Pressable
            onPress={() => setTab('companies')}
            style={[s.tab, comps && s.tabActive]}
            accessibilityRole="button"
            accessibilityLabel={t('admin.companies')}
          >
            <Text style={[s.tabTxt, comps && s.tabTxtActive]}>{t('admin.companies')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('monuments')}
            style={[s.tab, !comps && s.tabActive]}
            accessibilityRole="button"
            accessibilityLabel={t('admin.monuments')}
          >
            <Text style={[s.tabTxt, !comps && s.tabTxtActive]}>{t('admin.monuments')}</Text>
          </Pressable>
        </View>
        <Pressable
          style={s.create}
          onPress={() => router.push((comps ? '/admin/company-create' : '/admin/monument-create') as any)}
        >
          <Text style={s.createT}>+ {t('common.create')}</Text>
        </Pressable>
      </View>
      {comps ? (
        <AdminList
          bare
          table="companies"
          titleKey="admin.companies"
          createHref="/admin/company-create"
          editBase="/admin/company-edit"
          nameOf={(r, l) => (l === 'ar' ? r.name_ar : r.name_en)}
          key={`list-companies-${lang}`}
        />
      ) : (
        <AdminList
          bare
          table="monuments"
          titleKey="admin.monuments"
          createHref="/admin/monument-create"
          editBase="/admin/monument-edit"
          hideToggle
          nameOf={(r, l) => (l === 'ar' ? r.name_ar : r.name_en)}
          key={`list-monuments-${lang}`}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  tabs: { flex: 1, flexDirection: 'row', backgroundColor: '#F4F4F4', borderRadius: RADIUS.full, padding: 4, gap: 4 },
  tab: { flex: 1, borderRadius: RADIUS.full, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  tabTxt: { fontWeight: '700', color: COLORS.secondaryText, fontSize: 14 },
  tabTxtActive: { color: COLORS.text },
  create: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  createT: { color: '#fff', fontWeight: '700' },
});
