import { supabase } from './supabase';

export interface PlaceRow {
  kind: string;
  id: string;
  name_ar: string | null;
  name_en: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  avg_rating: number | null;
  review_count: number | null;
}

/**
 * Unified place search (companies + monuments + events, typo-tolerant).
 * Falls back to the legacy company-only RPC if migration 0008 hasn't been
 * run yet — the bar never goes dead, it just searches companies until then.
 */
export async function searchPlaces(q: string, limit = 25): Promise<PlaceRow[]> {
  const { data, error } = await supabase.rpc('search_places', {
    p_q: q,
    p_limit: limit,
    p_offset: 0,
  });
  if (!error && data) return data as PlaceRow[];
  const fb = await supabase.rpc('search_companies', {
    p_q: q,
    p_limit: limit,
    p_offset: 0,
  });
  if (fb.error) throw fb.error;
  return ((fb.data ?? []) as any[]).map((c) => ({
    kind: 'company',
    id: c.id,
    name_ar: c.name_ar ?? null,
    name_en: c.name_en ?? null,
    location: c.location ?? null,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    image_url: c.cover_url ?? c.logo_url ?? null,
    avg_rating: c.avg_rating ?? null,
    review_count: c.review_count ?? null,
  }));
}
