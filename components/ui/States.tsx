import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={s.wrap} accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={s.text}>{label ?? t('common.loading')}</Text>
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={s.wrap}>
      <Text style={s.err}>{message ?? t('common.error')}</Text>
      {onRetry ? <Text style={s.retry} onPress={onRetry}>{t('common.retry')}</Text> : null}
    </View>
  );
}
export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <View style={s.wrap}>
      <Text style={s.text}>{message ?? t('common.empty')}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  text: { color: COLORS.secondaryText, marginTop: 8, fontSize: 15, textAlign: 'center' },
  err: { color: COLORS.error, fontSize: 15, textAlign: 'center' },
  retry: { color: COLORS.primary, marginTop: 10, fontWeight: '600', fontSize: 15 },
});
