/**
 * Save guard: strip any key the database table doesn't have before insert/update.
 * A behind database then saves what it knows instead of failing the whole form
 * with a schema-cache error. Known columns mirror supabase/migrations.
 */

const COLS: Record<string, string[]> = {
  companies: [
    'name_en', 'name_ar', 'description_en', 'description_ar', 'category_id',
    'logo_url', 'cover_url', 'gallery_urls', 'location', 'lat', 'lng',
    'governorate', 'parent_company_id', 'phone', 'email', 'website',
    'opening_hours', 'price', 'citizen_price', 'currency', 'qr_points',
    'verified', 'active',
  ],
  events: [
    'category_id', 'title_ar', 'title_en', 'description_ar', 'description_en',
    'image_url', 'gallery_urls', 'location', 'governorate', 'lat', 'lng',
    'start_at', 'end_at', 'opening_time', 'closing_time', 'price', 'currency',
    'organizer', 'phone', 'website', 'capacity', 'active',
  ],
  services: [
    'company_id', 'category_id', 'name_ar', 'name_en', 'description_ar',
    'description_en', 'image_url', 'gallery_urls', 'base_price', 'citizen_price',
    'currency', 'duration', 'max_booking', 'current_booking', 'available',
    'available_from', 'available_to', 'dynamic_pricing_enabled',
    'max_price_increase_percentage', 'discount_enabled', 'current_discount_percentage',
  ],
  monuments: [
    'category_id', 'name_ar', 'name_en', 'description_ar', 'description_en',
    'image_url', 'gallery_urls', 'location', 'lat', 'lng', 'price',
    'citizen_price', 'currency', 'opening_hours', 'phone', 'website',
    'verified', 'active',
  ],
  categories: [
    'name_ar', 'name_en', 'description_ar', 'description_en', 'image_url', 'type',
  ],
  store_items: [
    'title_en', 'title_ar', 'description_en', 'description_ar', 'kind',
    'value', 'points_cost', 'image_url', 'active',
  ],
};

/** Keep only known columns (plus caller-provided extras); drop undefined. */
export function sanitizeFor(table: string, v: Record<string, any>, extra: string[] = []): Record<string, any> {
  const allow = new Set([...(COLS[table] ?? []), ...extra]);
  const out: Record<string, any> = {};
  for (const [k, val] of Object.entries(v ?? {})) {
    if (val === undefined) continue;
    if (allow.has(k)) out[k] = val;
  }
  return out;
}
