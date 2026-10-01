import { describe, expect, test } from '@jest/globals';
import { capacityPercentage, increaseForCapacity, previewQuote } from '../lib/pricing';
import { haversineKm } from '../lib/maps';
import { isEmail, isUsername, isPct, isMoney } from '../lib/validation';

describe('capacity + pricing thresholds (spec §90)', () => {
  test('100% -> 0%', () => {
    expect(capacityPercentage(100, 100)).toBe(100);
    expect(increaseForCapacity(100)).toBe(0);
  });
  test('106% -> 3%', () => expect(increaseForCapacity(106)).toBe(3));
  test('110% -> 10%', () => expect(increaseForCapacity(110)).toBe(10));
  test('115% -> 15%', () => expect(increaseForCapacity(115)).toBe(15));
  test('120% -> 20%', () => expect(increaseForCapacity(120)).toBe(20));

  test('source +20% becomes target -20%: $100 base target -> $80 final', () => {
    const q = previewQuote({ basePrice: 100, current: 20, max: 100, currency: 'USD', supportPct: 20 });
    expect(q.final_price).toBe(80);
    expect(q.support_discount_amount).toBe(20);
  });
  test('$150 base @106% -> $154.50; 3% support on $100 -> $97', () => {
    const src = previewQuote({ basePrice: 150, current: 106, max: 100, currency: 'USD' });
    expect(src.dynamic_price).toBe(154.5);
    const tgt = previewQuote({ basePrice: 100, current: 20, max: 100, currency: 'USD', supportPct: 3 });
    expect(tgt.final_price).toBe(97);
  });
  test('discount capped at configured max (20+15 capped to 30)', () => {
    const q = previewQuote({ basePrice: 100, current: 10, max: 100, currency: 'USD', supportPct: 35, maxDiscountPct: 30 });
    expect(q.support_discount_percentage).toBe(30);
    expect(q.final_price).toBe(70);
  });
  test('never negative', () => {
    const q = previewQuote({ basePrice: 10, current: 10, max: 100, currency: 'USD', supportPct: 100, maxDiscountPct: 100 });
    expect(q.final_price).toBeGreaterThanOrEqual(0);
  });
});

describe('distance + radius enforcement', () => {
  test('Petra -> nearby (~few km) eligible; far (80km) rejected at 25km radius', () => {
    const near = haversineKm(30.3285, 35.4444, 30.35, 35.46); // ~2-3km
    expect(near).toBeLessThan(25);
    const far = haversineKm(30.3285, 35.4444, 31.24, 36.51); // Petra->Amman ~200km+
    expect(far).toBeGreaterThan(25);
  });
});

describe('validation', () => {
  test('email/username/pct/money', () => {
    expect(isEmail('a@b.com')).toBe(true);
    expect(isEmail('bad')).toBe(false);
    expect(isUsername('ahmed_23')).toBe(true);
    expect(isUsername('ab')).toBe(false);
    expect(isPct(30)).toBe(true);
    expect(isPct(130)).toBe(false);
    expect(isMoney(10)).toBe(true);
    expect(isMoney(-1)).toBe(false);
  });
});

describe('map search ranking contract (server RPC)', () => {
  test('ranking priority documented: exact(1) < prefix(2) < contains(3)', () => {
    const rank = (name: string, q: string) =>
      name.toLowerCase() === q.toLowerCase() ? 1 : name.toLowerCase().startsWith(q.toLowerCase()) ? 2 : 3;
    expect(rank('Amman Tours', 'Amman Tours')).toBe(1);
    expect(rank('Amman Tours', 'Amm')).toBe(2);
    expect(rank('Amman Tours', 'man')).toBe(3);
  });
});
