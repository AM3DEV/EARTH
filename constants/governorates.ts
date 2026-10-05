/**
 * Jordan's 12 governorates + offline GPS detector for the Near Event system.
 * Tapping Near Event reads the tourist's GPS position, maps it to a governorate
 * (box containment in priority order, nearest-center fallback within Jordan),
 * and the list shows only the companies + events of that governorate.
 */
export const GOVERNORATES = [
  'amman', 'balqa', 'zarqa', 'madaba', 'karak', 'jerash',
  'ajloun', 'mafraq', 'irbid', 'aqaba', 'maan', 'tafilah',
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

/** [minLat, maxLat, minLng, maxLng] — ordered smallest-first so overlaps resolve to the smaller region. */
const BOXES: Array<{ g: Governorate; box: [number, number, number, number] }> = [
  { g: 'ajloun', box: [32.20, 32.45, 35.60, 35.95] },
  { g: 'jerash', box: [32.10, 32.40, 35.75, 36.05] },
  { g: 'irbid', box: [32.35, 32.80, 35.60, 36.05] },
  { g: 'balqa', box: [31.85, 32.20, 35.55, 35.95] },
  { g: 'madaba', box: [31.55, 31.90, 35.60, 36.00] },
  { g: 'amman', box: [31.60, 32.15, 35.70, 36.35] },
  { g: 'zarqa', box: [31.60, 32.30, 36.00, 37.60] },
  { g: 'karak', box: [30.95, 31.55, 35.50, 36.10] },
  { g: 'tafilah', box: [30.60, 31.10, 35.40, 35.90] },
  { g: 'maan', box: [29.80, 31.10, 35.00, 37.60] },
  { g: 'aqaba', box: [29.20, 29.90, 34.90, 35.40] },
  { g: 'mafraq', box: [31.80, 33.40, 36.00, 39.30] },
];

const CENTERS: Record<Governorate, [number, number]> = {
  amman: [31.95, 35.93],
  balqa: [32.04, 35.73],
  zarqa: [32.00, 37.02],
  madaba: [31.72, 35.79],
  karak: [31.18, 35.70],
  jerash: [32.27, 35.90],
  ajloun: [32.33, 35.75],
  mafraq: [32.34, 36.21],
  irbid: [32.55, 35.85],
  aqaba: [29.53, 35.01],
  maan: [30.19, 35.73],
  tafilah: [30.83, 35.61],
};

const kmBetween = (a: number, b: number, c: number, d: number) => {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Map a GPS position to a governorate slug, or null when far outside Jordan (caller shows the manual picker). */
export function detectGovernorate(lat: number, lng: number): Governorate | null {
  for (const { g, box } of BOXES) {
    if (lat >= box[0] && lat <= box[1] && lng >= box[2] && lng <= box[3]) return g;
  }
  let best: Governorate | null = null;
  let bestD = Infinity;
  for (const g of GOVERNORATES) {
    const d = kmBetween(lat, lng, CENTERS[g][0], CENTERS[g][1]);
    if (d < bestD) { bestD = d; best = g; }
  }
  return bestD <= 150 ? best : null;
}
