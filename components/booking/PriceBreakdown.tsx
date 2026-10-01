import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { formatMoney } from '../../lib/pricing';
import { Badge } from '../ui/Card';

export function PriceBreakdown({ quote, supportPct }: { quote: any; supportPct?: number }) {
  const { t } = useTranslation();
  if (!quote) return null;
  return (
    <View style={s.wrap}>
      <Row k={t('booking.basePrice')} v={formatMoney(quote.base_price ?? quote.basePrice, quote.currency)} />
      <Row k={t('booking.currentPrice')} v={formatMoney(quote.dynamic_price ?? quote.dynamicPrice, quote.currency)} />
      {(supportPct ?? quote.support_discount_percentage ?? 0) > 0 ? (
        <Row k={t('booking.supportDiscount')} v={`-${formatMoney(quote.support_discount_amount ?? 0, quote.currency)}`} />
      ) : null}
      <Row k={t('booking.finalPrice')} v={formatMoney(quote.final_price ?? quote.finalPrice, quote.currency)} bold />
      {(supportPct ?? 0) > 0 || (quote.support_discount_percentage ?? 0) > 0 ? (
        <Badge label={t('support.badge', { pct: supportPct ?? quote.support_discount_percentage })} tone="success" />
      ) : null}
    </View>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[s.k, bold && { fontWeight: '800', color: COLORS.text }]}>{k}</Text>
      <Text style={[s.v, bold && { fontWeight: '800', color: COLORS.text }]}>{v}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  k: { color: COLORS.secondaryText, fontSize: 14 },
  v: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});
