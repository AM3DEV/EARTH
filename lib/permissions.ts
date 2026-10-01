export const PERMISSIONS = [
  'manage_companies', 'manage_events', 'manage_services', 'manage_bookings',
  'manage_prices', 'manage_discounts', 'manage_promotions', 'manage_support_pricing',
  'view_reviews', 'view_own_logs', 'view_all_logs',
  'manage_administrators', 'manage_settings',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export function isAdminRole(role?: string | null) {
  return role === 'admin' || role === 'boss_admin';
}
export function isBoss(role?: string | null) {
  return role === 'boss_admin';
}
