import type { PricingThreshold, PriceQuote } from '../types';
import { DEFAULT_PRICING_THRESHOLDS } from '../constants/jordan';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function capacityPercentage(current: number, max: number): number {
  if (!max || max <= 0) return 0;
  return round2((current / max) * 100);
}

export function increaseForCapacity(capPct: number, thresholds: PricingThreshold[] = [...DEFAULT_PRICING_THRESHOLDS]): number {
  const t = thresholds.find((x) => capPct >= x.min && capPct <= x.max);
  return t ? t.increase : 0;
}

/** Client-side preview only. Server is authoritative — see supabase RPC calculate_price_quote. */
export function previewQuote(input: {
  basePrice: number; current: number; max: number; currency: string;
  supportPct?: number; thresholds?: PricingThreshold[]; maxDiscountPct?: number;
}): PriceQuote {
  const cap = capacityPercentage(input.current, input.max);
  const incPct = increaseForCapacity(cap, input.thresholds);
  const incAmt = round2((input.basePrice * incPct) / 100);
  const dynamic = round2(input.basePrice + incAmt);
  const supPct = Math.min(input.supportPct ?? 0, input.maxDiscountPct ?? 30);
  const supAmt = round2((dynamic * supPct) / 100);
  const final = Math.max(round2(dynamic - supAmt), 0);
  return {
    capacity_percentage: cap,
    price_increase_percentage: incPct,
    price_increase_amount: incAmt,
    dynamic_price: dynamic,
    support_discount_percentage: supPct,
    support_discount_amount: supAmt,
    final_price: final,
    currency: input.currency,
  };
}

export function formatMoney(amount: number | null | undefined, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
