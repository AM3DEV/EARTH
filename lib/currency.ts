import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '../hooks/useAuth';

/** Display currencies a tourist can pick at registration. */
export const CURRENCIES = [
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
] as const;

const RATES_KEY = 'jg.fxrates';
const RATES_TTL = 24 * 3600 * 1000; // 24h cache

/** Units per 1 JOD. Fallback used offline / before first fetch. */
const FALLBACK_RATES: Record<string, number> = { JOD: 1, USD: 1.41, EUR: 1.3, GBP: 1.12, SAR: 5.3 };

let mem: { ts: number; rates: Record<string, number> } | null = null;

/** Live FX (base JOD, free no-key API) with 24h cache + offline fallback. */
export async function getRates(): Promise<Record<string, number>> {
  if (mem && Date.now() - mem.ts < RATES_TTL) return mem.rates;
  try {
    const saved = await AsyncStorage.getItem(RATES_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      if (p && Date.now() - p.ts < RATES_TTL && p.rates) {
        mem = p;
        return p.rates;
      }
    }
  } catch {}
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/JOD');
    const j = await r.json();
    if (j?.result === 'success' && j.rates) {
      const rates: Record<string, number> = { JOD: 1 };
      for (const c of CURRENCIES) if (j.rates[c.code]) rates[c.code] = Number(j.rates[c.code]);
      mem = { ts: Date.now(), rates };
      AsyncStorage.setItem(RATES_KEY, JSON.stringify(mem)).catch(() => {});
      return rates;
    }
  } catch {}
  return FALLBACK_RATES;
}

/** Convert amount from one currency to another. Display-only (server prices untouched). */
export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  const a = Number(amount) || 0;
  if (!from || !to || from === to) return Math.round(a * 100) / 100;
  const rf = rates[from] ?? 1;
  const rt = rates[to] ?? 1;
  return Math.round(((a / rf) * rt) * 100) / 100;
}

function trimNum(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * Tourist price display: profile currency + live rates.
 * fmt(amount, fromCurrency) → "12.5 USD". Use everywhere prices are SHOWN
 * (booking still charges the server-computed price in its own currency).
 */
export function usePrice() {
  const { profile } = useProfile();
  const to = (profile as any)?.currency ?? 'JOD';
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  useEffect(() => {
    getRates().then(setRates).catch(() => {});
  }, []);
  const fmt = useCallback(
    (amount: number | null | undefined, from?: string | null) => {
      if (amount == null) return '';
      return `${trimNum(convert(amount, from ?? 'JOD', to, rates))} ${to}`;
    },
    [to, rates]
  );
  return { currency: to, fmt };
}
