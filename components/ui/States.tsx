import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Palette } from '../../lib/theme';

export function LoadingState({ label }: { label?: string }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation();
  return (
    <View style={s.wrap} accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={s.text}>{label ?? t('common.loading')}</Text>
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation();
  return (
    <View style={s.wrap}>
      <Text style={s.err}>{message ?? t('common.error')}</Text>
      {onRetry ? <Text style={s.retry} onPress={onRetry}>{t('common.retry')}</Text> : null}
    </View>
  );
}
export function EmptyState({ message }: { message?: string }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation();
  return (
    <View style={s.wrap}>
      <Text style={s.text}>{message ?? t('common.empty')}</Text>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.background },
  text: { color: C.secondaryText, marginTop: 8, fontSize: 15, textAlign: 'center' },
  err: { color: C.error, fontSize: 15, textAlign: 'center' },
  retry: { color: C.primary, marginTop: 10, fontWeight: '600', fontSize: 15 },
});
