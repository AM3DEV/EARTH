// Jordan-centered map defaults. Never break UX when location denied.
export const JORDAN_REGION = {
  latitude: 31.24,
  longitude: 36.51,
  latitudeDelta: 4.5,
  longitudeDelta: 4.5,
} as const;

export const SUPPORT_DEFAULTS = {
  radiusKm: 25,
  maxDiscountPct: 30,
  minTargetCapacity: 0,
  maxTargetCapacity: 70,
  discountDurationHours: 48,
} as const;

export const DEFAULT_PRICING_THRESHOLDS = [
  { min: 0, max: 100, increase: 0 },
  { min: 101, max: 106, increase: 3 },
  { min: 107, max: 110, increase: 10 },
  { min: 111, max: 115, increase: 15 },
  { min: 116, max: 9999, increase: 20 },
] as const;
