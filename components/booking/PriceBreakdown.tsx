import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Palette } from '../../lib/theme';
import { Badge } from '../ui/Card';
import { usePrice } from '../../lib/currency';

export function PriceBreakdown({ quote, supportPct }: { quote: any; supportPct?: number }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation();
  const { fmt } = usePrice();
  if (!quote) return null;
  const cur = quote.currency;
  return (
    <View style={s.wrap}>
      <Row k={t('booking.basePrice')} v={fmt(quote.base_price ?? quote.basePrice, cur)} />
      <Row k={t('booking.currentPrice')} v={fmt(quote.dynamic_price ?? quote.dynamicPrice, cur)} />
      {(supportPct ?? quote.support_discount_percentage ?? 0) > 0 ? (
        <Row k={t('booking.supportDiscount')} v={`-${fmt(quote.support_discount_amount ?? 0, cur)}`} />
      ) : null}
      {(quote.coupon_discount_amount ?? 0) > 0 ? (
        <Row k={t('booking.couponDiscount')} v={`-${fmt(quote.coupon_discount_amount ?? 0, cur)}`} />
      ) : null}
      <Row k={t('booking.finalPrice')} v={fmt(quote.final_price ?? quote.finalPrice, cur)} bold />
      {(supportPct ?? 0) > 0 || (quote.support_discount_percentage ?? 0) > 0 ? (
        <Badge label={t('support.badge', { pct: supportPct ?? quote.support_discount_percentage })} tone="success" />
      ) : null}
    </View>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <View style={s.row}>
      <Text style={[s.k, bold && { fontWeight: '800', color: C.text }]}>{k}</Text>
      <Text style={[s.v, bold && { fontWeight: '800', color: C.text }]}>{v}</Text>
    </View>
  );
}
const getStyles = (C: Palette) => StyleSheet.create({
  wrap: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  k: { color: C.secondaryText, fontSize: 14 },
  v: { color: C.text, fontSize: 14, fontWeight: '600' },
});
