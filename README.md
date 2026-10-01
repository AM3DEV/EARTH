# Jordan Tourism Guide 🇯🇴

Production-ready tourism platform: React Native + Expo (Go-compatible) + TypeScript + Expo Router + Supabase (Postgres, Auth, Storage, RLS, Edge Functions) + react-native-maps.

## Features
- Map-first tourist home (Jordan fallback, user location, DB markers, preview cards, directions)
- Signature Map Search: compact floating bar → Reanimated expand → debounced server-side `search_companies` RPC (pg_trgm, ranked exact→prefix→contains→category→location), FlatList pagination, keyboard-safe
- Monuments / Events / Companies / Services (DB-driven), detail pages with map, favorites, share, real review aggregation
- Booking system: transactional `create_booking` RPC — locks capacity, authoritative price, snapshot, notification, history. Human refs `JOR-2026-AB1234`
- **Smart pricing**: capacity% → progressive increase (0/3/10/15/20%, DB-configurable `pricing_rules`) → increase% becomes support discount for **nearby** low-booking event (Haversine, 25km default, fair rotation, `pending_allocation` if none eligible, max cap, stacking flag, expiry)
- Service Plus promotions (`event_promotions`, PLUS/7/14/30d, priority, scheduling, discovery ranking)
- Erth / إرث AI: Edge Function `erth-chat` verifies JWT, pulls real DB context, calls Groq (Llama 3 70B) with server-only `GROQ_API_KEY`, persists `ai_conversations/messages`. Never hallucinates prices.
- Auth: onboarding → login/register (username OR email via `resolve_login_email` RPC) → role routing (user/admin/boss_admin). Public signup only `user`.
- i18n: English LTR + Arabic RTL (`locales/en|ar/common.json`, persisted, RTL force)
- Admin: dashboard (real `admin_dashboard_stats`), companies/events/services/bookings/pricing/discounts/promotions/support-pricing (+red/green map)/reviews/activity (own vs all)/profile/administrators (boss only)/settings
- Security: RLS everywhere, server role/permission/price/capacity/discount/distance checks, no service-role/AI secrets in client

## Tech
expo ~52, expo-router ~4, react-native-maps 1.18, expo-location/image/image-picker, reanimated, gesture-handler, lucide-react-native, i18next+react-i18next, @supabase/supabase-js

## Structure
```
app/ (auth) (tabs) monument/ event/ company/ service/ booking/ admin/
components/ lib/ hooks/ types/ constants/ locales/ assets/
supabase/migrations/ supabase/functions/erth-chat/
__tests__/
```

## Setup
1. `npm install`
2. Copy `.env.example` → `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```
3. Supabase: create project → SQL Editor → run `supabase/migrations/*.sql` in order → create Storage buckets `avatars monuments events companies services categories` (public read) → Edge Functions → deploy `erth-chat` → set secrets `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` (from https://groq.com), optionally `ERTH_MODEL` (default `llama-3.3-70b-versatile`) — never `EXPO_PUBLIC_`.
4. Auth → enable email provider → set redirect for password reset.
5. `npx expo start` (Expo Go: prefer SDK-compatible packages listed in package.json; no custom dev build needed).

## Roles
- First boss: SQL `insert into user_roles (user_id, role) values ('<uid>','boss_admin')` then manage others from Admin → Administrators (deactivate preferred over delete).

## Pricing model (summary)
`capacity% = current/max*100` → threshold increase → `dynamic = base + inc` → source increase% → search eligible nearby (≤25km, active, capacity 0–70%, fair rotation) → target `final = max(dynamic - discount, 0)`. No target → `pending_allocation`. All in `calculate_price_quote` / `allocate_support_discount` / `create_booking`.

## Testing
`npm test` — capacity thresholds, support math, cap, radius, validation, ranking contract. DB-level: test RLS as anon/auth/admin, race `create_booking` concurrently, Arabic search (`عمان`), first-letter `A` returns paginated matches.

## Production build
`eas build -p android|ios`. Set Google Maps keys in `app.json` for native maps. Configure cron (`expire_stale()`) for promotion/discount expiry.
