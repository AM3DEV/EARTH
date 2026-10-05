/**
 * Night style for the native map (Google Maps JSON). Applied automatically
 * in Dark mode by the NativeMap wrapper — web uses CARTO dark tiles instead.
 */
export const NIGHT_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d1a17' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d8c9bc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1a17' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4a3d33' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#241d17' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2e241c' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f2a1e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3d3129' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#241d17' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a08e7e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5a4632' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#241d17' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2e241c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e2a3a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5b7a8c' }] },
];

/**
 * Tile keys. Priority: Jawg -> Stadia -> free keyless CARTO.
 * Jawg free token (no credit card): https://www.jawg.io/
 * Stadia free key (no credit card): https://client.stadiamaps.com/
 */
export const JAWG_TOKEN = 'YPy4H8bkgVMlZKGkrVuRNf54340Gdbcw47SCReHrbZsskFF8vFtDV9O5OP8rEB34';
export const TILE_API_KEY = '8dd41c0e-9724-4c0b-8592-990c403bcb64';

const JW_DAY = 'jawg-streets';
const JW_NIGHT = 'jawg-dark'; // Waze-like glowing night streets
const ST_DAY = 'alidade_smooth';
const ST_NIGHT = 'alidade_smooth_dark';

function withKey(url: string): string {
  return TILE_API_KEY ? `${url}?api_key=${TILE_API_KEY}` : url;
}

/** Day style: CARTO Voyager (warm, matches the app). */
export const CARTO_DAY = 'voyager';
/** Night style: CARTO dark matter. */
export const CARTO_NIGHT = 'dark_all';

/** Web (Leaflet) tile template — {s} expands to a/b/c/d, {r} is retina. */
export function cartoWebUrl(style: string): string {
  if (JAWG_TOKEN) {
    const jw = style === CARTO_NIGHT ? JW_NIGHT : JW_DAY;
    return `https://tile.jawg.io/${jw}/{z}/{x}/{y}{r}.png?access-token=${JAWG_TOKEN}`;
  }
  if (TILE_API_KEY) {
    const st = style === CARTO_NIGHT ? ST_NIGHT : ST_DAY;
    return `https://tiles.stadiamaps.com/tiles/${st}/{z}/{x}/{y}{r}.png?api_key=${TILE_API_KEY}`;
  }
  return withKey(`https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png`);
}

/** Native (UrlTile) template — fixed subdomain, no {s}/{r} expansion. */
export function cartoNativeUrl(style: string): string {
  if (JAWG_TOKEN) {
    const jw = style === CARTO_NIGHT ? JW_NIGHT : JW_DAY;
    return `https://tile.jawg.io/${jw}/{z}/{x}/{y}.png?access-token=${JAWG_TOKEN}`;
  }
  if (TILE_API_KEY) {
    const st = style === CARTO_NIGHT ? ST_NIGHT : ST_DAY;
    return `https://tiles.stadiamaps.com/tiles/${st}/{z}/{x}/{y}.png?api_key=${TILE_API_KEY}`;
  }
  return withKey(`https://c.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png`);
}

export function tileAttribution(): string {
  if (JAWG_TOKEN) {
    return '&copy; <a href="https://www.jawg.io" target="_blank">Jawg</a>Maps &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
  }
  if (TILE_API_KEY) {
    return '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
  }
  return DARK_ATTRIBUTION;
}

export const DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
