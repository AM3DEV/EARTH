/**
 * Authentic Jordan photography (local assets — always available offline).
 * Metro requires static require() calls, so every photo is mapped here.
 * To swap/extend: drop files into assets/monuments/ and add entries below.
 */
export const PHOTOS = {
  petra: require('../assets/monuments/petra.jpg'),
  wadiRum: require('../assets/monuments/wadi-rum.jpg'),
  deadSea: require('../assets/monuments/dead-sea.jpg'),
  jerash: require('../assets/monuments/jerash.jpg'),
  ajloun: require('../assets/monuments/ajloun-castle.jpg'),
  citadel: require('../assets/monuments/amman-citadel.jpg'),
  theatre: require('../assets/monuments/roman-theatre.jpg'),
  aqaba: require('../assets/monuments/aqaba.png'),
} as const;

export type PhotoKey = keyof typeof PHOTOS;

/** Cinematic rotation for splash / heroes. */
export const HERO_ROTATION = [
  PHOTOS.petra,
  PHOTOS.wadiRum,
  PHOTOS.jerash,
  PHOTOS.deadSea,
  PHOTOS.aqaba,
];

/** Auth backgrounds — different monument per screen (Login Petra, Register Wadi Rum). */
export const LOGIN_BG = PHOTOS.petra;
export const REGISTER_BG = PHOTOS.wadiRum;
export const SPLASH_BG = PHOTOS.petra;

/** Onboarding slides pair with the existing 5 content slides. */
export const ONBOARDING_PHOTOS = [
  PHOTOS.petra,
  PHOTOS.jerash,
  PHOTOS.wadiRum,
  PHOTOS.deadSea,
  PHOTOS.citadel,
];

/** Photo fallback for a detail hero when the DB row has no image. */
export function fallbackPhoto(seed = ''): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HERO_ROTATION[h % HERO_ROTATION.length];
}
