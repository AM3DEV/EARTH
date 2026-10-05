-- 0028_catchup.sql - ONE file that brings any older database fully up to date.
-- Run this SINGLE file in Supabase SQL Editor (it replaces running 0001-0027 one by one).
-- SAFE: every statement is idempotent (IF NOT EXISTS / OR REPLACE / guarded updates).
-- Run it twice and nothing changes the second time.
-- NOTE: contains NO demo seed rows. Content backfills (photos, Arabic
-- descriptions, demo-strip) are included because they are guarded WHERE updates.

-- ============ 0. EXTENSIONS ============
create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ============ 1. TABLES (base) ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  username text unique not null,
  avatar_url text,
  language text not null default 'en' check (language in ('en','ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_url text,
  type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monuments (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_url text,
  location text,
  lat double precision,
  lng double precision,
  price numeric(12,2),
  currency text default 'USD',
  opening_hours text,
  phone text,
  website text,
  rating numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  title_ar text not null,
  title_en text not null,
  description_ar text,
  description_en text,
  image_url text,
  location text,
  lat double precision,
  lng double precision,
  start_at timestamptz,
  end_at timestamptz,
  opening_time text,
  closing_time text,
  price numeric(12,2),
  currency text default 'USD',
  organizer text,
  phone text,
  website text,
  capacity int check (capacity is null or capacity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  logo_url text,
  cover_url text,
  location text,
  lat double precision,
  lng double precision,
  phone text,
  email text,
  website text,
  opening_hours text,
  rating numeric(3,2),
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_url text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  current_price numeric(12,2) not null default 0 check (current_price >= 0),
  currency text not null default 'USD',
  duration text,
  max_booking int not null default 100 check (max_booking >= 0),
  current_booking int not null default 0 check (current_booking >= 0),
  available boolean not null default true,
  available_from timestamptz,
  available_until timestamptz,
  dynamic_pricing_enabled boolean not null default true,
  max_price_increase_percentage numeric(5,2) not null default 20 check (max_price_increase_percentage >= 0),
  discount_enabled boolean not null default true,
  current_discount_percentage numeric(5,2) not null default 0 check (current_discount_percentage >= 0 and current_discount_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('monument','event','company','service')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('monument','event','company','service')),
  target_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  company_id uuid references companies(id) on delete set null,
  booking_date timestamptz not null,
  quantity int not null default 1 check (quantity > 0),
  base_price numeric(12,2) not null,
  capacity_percentage numeric(7,2),
  price_increase_percentage numeric(7,2),
  price_increase_amount numeric(12,2),
  dynamic_price numeric(12,2),
  support_discount_percentage numeric(7,2),
  support_discount_amount numeric(12,2),
  source_event_id uuid references events(id) on delete set null,
  support_discount_id uuid,
  final_price numeric(12,2) not null check (final_price >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','expired','rejected')),
  booking_reference text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_price_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  old_price numeric(12,2),
  new_price numeric(12,2),
  booking_percentage numeric(7,2),
  price_increase_percentage numeric(7,2),
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references services(id) on delete cascade,
  enabled boolean not null default true,
  max_increase_percentage numeric(5,2) not null default 20 check (max_increase_percentage >= 0),
  booking_thresholds jsonb not null default '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb,
  support_discount_enabled boolean not null default true,
  maximum_support_discount_percentage numeric(5,2) not null default 30,
  maximum_support_radius_km numeric(8,2) not null default 25,
  minimum_target_capacity_percentage numeric(7,2) not null default 0,
  maximum_target_capacity_percentage numeric(7,2) not null default 70,
  allow_discount_stacking boolean not null default false,
  discount_duration text not null default '48 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_support_discounts (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references events(id) on delete cascade,
  target_event_id uuid references events(id) on delete set null,
  source_service_id uuid references services(id) on delete cascade,
  source_capacity_percentage numeric(7,2),
  source_price_increase_percentage numeric(7,2),
  discount_percentage numeric(7,2) not null check (discount_percentage >= 0 and discount_percentage <= 100),
  discount_amount numeric(12,2),
  distance_km numeric(8,2),
  status text not null default 'pending_allocation' check (status in ('active','scheduled','expired','cancelled','used','pending_allocation')),
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_promotions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  plan text not null default 'PLUS' check (plan in ('FREE','PLUS','PREMIUM','FEATURED')),
  status text not null default 'scheduled' check (status in ('active','scheduled','expired','cancelled')),
  priority int not null default 100,
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  price numeric(12,2),
  currency text default 'USD',
  payment_status text,
  payment_reference text
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin','boss_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user','admin','boss_admin')),
  permission text not null,
  created_at timestamptz not null default now(),
  unique (role, permission)
);

create table if not exists admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_name_snapshot text,
  action text not null,
  entity_type text,
  entity_id text,
  entity_name text,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points int not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  points int not null,
  kind text not null check (kind in ('earn', 'redeem')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_ar text not null,
  description_en text,
  description_ar text,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12,2) not null default 0 check (value >= 0),
  points_cost int not null default 100 check (points_cost >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  store_item_id uuid references store_items(id) on delete set null,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists place_translations (
  id uuid primary key default gen_random_uuid(),
  place_kind text not null,
  place_id uuid not null,
  lang text not null,
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_kind, place_id, lang)
);

-- ============ 2. LATER COLUMNS (no-op if already present) ============
-- profiles: account kind, all 10 languages, display currency
alter table profiles add column if not exists user_kind text
  check (user_kind is null or user_kind in ('citizen', 'tourist'));
alter table profiles add column if not exists currency text not null default 'JOD';
alter table profiles drop constraint if exists profiles_language_check;
alter table profiles add constraint profiles_language_check
  check (language in ('en', 'ar', 'fr', 'de', 'es', 'it', 'ru', 'tr', 'zh', 'nl'));

-- galleries + availability windows
alter table companies add column if not exists gallery_urls text[] not null default '{}';
alter table events add column if not exists gallery_urls text[] not null default '{}';
alter table services add column if not exists gallery_urls text[] not null default '{}';
alter table monuments add column if not exists gallery_urls text[] not null default '{}';
alter table services add column if not exists available_from date;
alter table services add column if not exists available_to date;

-- ratings for events/services (review trigger target)
alter table events add column if not exists rating numeric(3,2);
alter table services add column if not exists rating numeric(3,2);

-- loyalty QR identity on companies
alter table companies add column if not exists qr_token text;
alter table companies add column if not exists qr_points int not null default 10;
update companies set qr_token = replace(gen_random_uuid()::text, '-', '') where qr_token is null;
alter table companies alter column qr_token set default replace(gen_random_uuid()::text, '-', '');
alter table companies alter column qr_token set not null;

-- loyalty/coupon receipt columns on bookings
alter table bookings add column if not exists points_redeemed int not null default 0;
alter table bookings add column if not exists loyalty_discount_amount numeric(12,2) not null default 0;
alter table bookings add column if not exists coupon_id uuid references coupons(id) on delete set null;
alter table bookings add column if not exists coupon_discount_amount numeric(12,2) not null default 0;

-- dual pricing
alter table services add column if not exists citizen_price numeric(12,2)
  check (citizen_price is null or citizen_price >= 0);
alter table monuments add column if not exists citizen_price numeric(12,2)
  check (citizen_price is null or citizen_price >= 0);
alter table companies add column if not exists price numeric(12,2)
  check (price is null or price >= 0);
alter table companies add column if not exists citizen_price numeric(12,2)
  check (citizen_price is null or citizen_price >= 0);
alter table companies add column if not exists currency text default 'JOD';

-- governorates (with allowed-values guard)
alter table companies add column if not exists governorate text;
alter table events add column if not exists governorate text;
do $$ begin
  alter table companies add constraint companies_governorate_check
    check (governorate is null or governorate in
      ('amman','balqa','zarqa','madaba','karak','jerash','ajloun','mafraq','irbid','aqaba','maan','tafilah'));
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table events add constraint events_governorate_check
    check (governorate is null or governorate in
      ('amman','balqa','zarqa','madaba','karak','jerash','ajloun','mafraq','irbid','aqaba','maan','tafilah'));
exception when duplicate_object then null;
end $$;

-- sub-companies
alter table companies add column if not exists parent_company_id uuid references companies(id) on delete cascade;

-- monument flags (verified / active, like companies)
alter table monuments add column if not exists verified boolean not null default false;
alter table monuments add column if not exists active boolean not null default true;

-- service-sourced support rows (source event optional)
alter table event_support_discounts add column if not exists source_service_id uuid references services(id) on delete cascade;
alter table event_support_discounts alter column source_event_id drop not null;

-- pricing bands default (latest)
alter table pricing_rules alter column booking_thresholds set default
  '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb;
update pricing_rules set booking_thresholds =
  '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb
where booking_thresholds = '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb
   or booking_thresholds = '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":94,"increase":15},{"min":95,"max":9999,"increase":20}]'::jsonb;

-- ============ 3. INDEXES ============
create index if not exists idx_companies_name_en_trgm on companies using gin (name_en gin_trgm_ops);
create index if not exists idx_companies_name_ar_trgm on companies using gin (name_ar gin_trgm_ops);
create index if not exists idx_companies_category on companies (category_id);
create index if not exists idx_companies_active on companies (active) where active = true;
create index if not exists idx_events_category on events (category_id);
create index if not exists idx_events_active on events (active) where active = true;
create index if not exists idx_events_start on events (start_at);
create index if not exists idx_events_geo on events (lat, lng);
create index if not exists idx_services_company on services (company_id);
create index if not exists idx_services_category on services (category_id);
create index if not exists idx_services_available on services (available) where available = true;
create index if not exists idx_bookings_user on bookings (user_id);
create index if not exists idx_bookings_service on bookings (service_id);
create index if not exists idx_bookings_date on bookings (booking_date);
create index if not exists idx_bookings_status on bookings (status);
create index if not exists idx_reviews_target on reviews (target_type, target_id);
create index if not exists idx_favorites_user on favorites (user_id);
create index if not exists idx_support_source on event_support_discounts (source_event_id);
create index if not exists idx_support_target on event_support_discounts (target_event_id);
create index if not exists idx_support_status on event_support_discounts (status);
create index if not exists idx_support_source_service on event_support_discounts (source_service_id);
create index if not exists idx_promo_event on event_promotions (event_id);
create index if not exists idx_promo_status on event_promotions (status);
create index if not exists idx_promo_window on event_promotions (start_at, end_at);
create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);
create index if not exists idx_logs_admin on admin_activity_logs (admin_user_id, created_at desc);
create index if not exists idx_ledger_user on loyalty_ledger (user_id, created_at desc);
create index if not exists idx_coupons_user on coupons (user_id, created_at desc);
create index if not exists idx_coupons_code on coupons (code);
create unique index if not exists companies_qr_token_uidx on companies (qr_token);
create index if not exists idx_companies_governorate on companies(governorate);
create index if not exists idx_events_governorate on events(governorate);
create index if not exists idx_companies_parent on companies(parent_company_id);
create index if not exists idx_place_translations_lookup on place_translations(place_kind, place_id, lang);
-- duplicate guards (skipped silently if duplicates still exist — dedupe manually first)
do $$ begin
  create unique index monuments_name_en_uidx on monuments (lower(trim(name_en)));
exception when duplicate_table or unique_violation then null;
end $$;
do $$ begin
  create unique index categories_name_en_uidx on categories (lower(trim(name_en)));
exception when duplicate_table or unique_violation then null;
end $$;
do $$ begin
  create unique index companies_name_en_uidx on companies (lower(trim(name_en)));
exception when duplicate_table or unique_violation then null;
end $$;
do $$ begin
  create unique index events_title_en_uidx on events (lower(trim(title_en)));
exception when duplicate_table or unique_violation then null;
end $$;

-- ============ 4. VIEWS ============
-- DROP first: CREATE OR REPLACE fails when the stored view has an older column list.
drop view if exists event_discovery;
create view event_discovery as
select e.*,
  (select count(*) > 0 from event_promotions p
    where p.event_id = e.id and p.status = 'active'
      and (p.start_at is null or p.start_at <= now())
      and (p.end_at is null or p.end_at >= now())) as is_promoted,
  (select max(p.priority) from event_promotions p
    where p.event_id = e.id and p.status = 'active'
      and (p.start_at is null or p.start_at <= now())
      and (p.end_at is null or p.end_at >= now())) as promo_priority
from events e
where e.active = true
order by is_promoted desc, promo_priority desc nulls last, e.start_at asc nulls last, e.created_at desc;

drop view if exists public_profiles;
create view public_profiles as
select id, first_name, last_name, username, avatar_url
from profiles;
revoke all on public_profiles from public, anon, authenticated;
grant select on public_profiles to anon, authenticated;

-- ============ 5. RLS + POLICIES ============
alter table profiles enable row level security;
alter table categories enable row level security;
alter table monuments enable row level security;
alter table events enable row level security;
alter table companies enable row level security;
alter table services enable row level security;
alter table favorites enable row level security;
alter table reviews enable row level security;
alter table bookings enable row level security;
alter table service_price_history enable row level security;
alter table pricing_rules enable row level security;
alter table event_support_discounts enable row level security;
alter table event_promotions enable row level security;
alter table user_roles enable row level security;
alter table role_permissions enable row level security;
alter table admin_activity_logs enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table notifications enable row level security;
alter table app_settings enable row level security;
alter table loyalty_wallets enable row level security;
alter table loyalty_ledger enable row level security;
alter table store_items enable row level security;
alter table coupons enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','boss_admin'));
$$;
create or replace function public.is_boss() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'boss_admin');
$$;
create or replace function public.has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    join role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.permission = p
  ) or public.is_boss();
$$;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "public read monuments" on monuments;
create policy "public read monuments" on monuments for select using (true);
drop policy if exists "public read events" on events;
create policy "public read events" on events for select using (active = true);
drop policy if exists "admin all events" on events;
create policy "admin all events" on events for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public read companies" on companies;
create policy "public read companies" on companies for select using (active = true);
drop policy if exists "admin all companies" on companies;
create policy "admin all companies" on companies for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all monuments" on monuments;
create policy "admin all monuments" on monuments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all categories" on categories;
create policy "admin all categories" on categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public read services" on services;
create policy "public read services" on services for select using (available = true);
drop policy if exists "admin all services" on services;
create policy "admin all services" on services for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "admin read profiles" on profiles;
create policy "admin read profiles" on profiles for select using (public.is_admin());
drop policy if exists "read own role" on user_roles;
create policy "read own role" on user_roles for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "boss manage roles" on user_roles;
create policy "boss manage roles" on user_roles for all using (public.is_boss()) with check (public.is_boss());
drop policy if exists "read perms" on role_permissions;
create policy "read perms" on role_permissions for select using (true);
drop policy if exists "boss manage perms" on role_permissions;
create policy "boss manage perms" on role_permissions for all using (public.is_boss()) with check (public.is_boss());
drop policy if exists "own favorites" on favorites;
create policy "own favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own bookings read" on bookings;
create policy "own bookings read" on bookings for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin bookings manage" on bookings;
create policy "admin bookings manage" on bookings for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "own booking insert" on bookings;
create policy "own booking insert" on bookings for insert with check (auth.uid() = user_id);
drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own convos" on ai_conversations;
create policy "own convos" on ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own msgs" on ai_messages;
create policy "own msgs" on ai_messages for all using (
  exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
);
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);
drop policy if exists "own review write" on reviews;
create policy "own review write" on reviews for insert with check (auth.uid() = user_id);
drop policy if exists "own review update" on reviews;
create policy "own review update" on reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin review delete" on reviews;
create policy "admin review delete" on reviews for delete using (public.is_admin());
drop policy if exists "public read pricing" on pricing_rules;
create policy "public read pricing" on pricing_rules for select using (true);
drop policy if exists "admin pricing" on pricing_rules;
create policy "admin pricing" on pricing_rules for all using (public.has_permission('manage_prices')) with check (public.has_permission('manage_prices'));
drop policy if exists "public read support" on event_support_discounts;
create policy "public read support" on event_support_discounts for select using (status = 'active');
drop policy if exists "admin support" on event_support_discounts;
create policy "admin support" on event_support_discounts for all using (public.has_permission('manage_support_pricing')) with check (public.has_permission('manage_support_pricing'));
drop policy if exists "public read promos" on event_promotions;
create policy "public read promos" on event_promotions for select using (status = 'active');
drop policy if exists "admin promos" on event_promotions;
create policy "admin promos" on event_promotions for all using (public.has_permission('manage_promotions')) with check (public.has_permission('manage_promotions'));
drop policy if exists "admin price history" on service_price_history;
create policy "admin price history" on service_price_history for select using (true);
drop policy if exists "own logs" on admin_activity_logs;
create policy "own logs" on admin_activity_logs for select using (admin_user_id = auth.uid() or public.is_boss());
drop policy if exists "server log insert" on admin_activity_logs;
create policy "server log insert" on admin_activity_logs for insert with check (true);
drop policy if exists "public read settings" on app_settings;
create policy "public read settings" on app_settings for select using (true);
drop policy if exists "admin settings" on app_settings;
create policy "admin settings" on app_settings for all using (public.has_permission('manage_settings')) with check (public.has_permission('manage_settings'));
drop policy if exists "own wallet" on loyalty_wallets;
create policy "own wallet" on loyalty_wallets for select using (auth.uid() = user_id);
drop policy if exists "own ledger" on loyalty_ledger;
create policy "own ledger" on loyalty_ledger for select using (auth.uid() = user_id);
drop policy if exists "admin all loyalty" on loyalty_wallets;
create policy "admin all loyalty" on loyalty_wallets for select using (public.is_admin());
drop policy if exists "admin all ledger" on loyalty_ledger;
create policy "admin all ledger" on loyalty_ledger for select using (public.is_admin());
drop policy if exists "public read store" on store_items;
create policy "public read store" on store_items for select using (active = true);
drop policy if exists "admin all store" on store_items;
create policy "admin all store" on store_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "own coupons" on coupons;
create policy "own coupons" on coupons for select using (auth.uid() = user_id);
drop policy if exists "admin all coupons" on coupons;
create policy "admin all coupons" on coupons for select using (public.is_admin());
drop policy if exists "public read storage" on storage.objects;
create policy "public read storage" on storage.objects for select using (bucket_id in ('avatars','monuments','events','companies','services','categories'));
drop policy if exists "auth upload storage" on storage.objects;
create policy "auth upload storage" on storage.objects for insert with check (bucket_id in ('avatars','monuments','events','companies','services','categories') and auth.role() = 'authenticated');
drop policy if exists "auth update own storage" on storage.objects;
create policy "auth update own storage" on storage.objects for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete storage" on storage.objects;
create policy "admin delete storage" on storage.objects for delete using (public.is_admin());

-- ============ 6. FUNCTIONS (latest versions) ============
create or replace function resolve_login_email(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from profiles where lower(username) = lower(trim(p_username)) limit 1;
  return v_email;
end $$;

create or replace function search_companies(p_q text, p_limit int default 25,
p_offset int default 0)
returns table (
  id uuid, category_id uuid, name_ar text, name_en text, description_ar text, description_en text,
  logo_url text, cover_url text, location text, lat double precision, lng double precision,
  phone text, email text, website text, opening_hours text, rating numeric, verified boolean, active boolean,
  avg_rating numeric, review_count bigint, rank int
) language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q,''));
begin
  if q = '' then return; end if;
  return query
  with agg as (
    select r.target_id, round(avg(r.rating)::numeric,1) as ar, count(*)::bigint as rc
    from reviews r where r.target_type = 'company' group by r.target_id
  )
  select c.id, c.category_id, c.name_ar, c.name_en, c.description_ar, c.description_en,
    c.logo_url, c.cover_url, c.location, c.lat, c.lng, c.phone, c.email, c.website,
    c.opening_hours, c.rating, c.verified, c.active,
    coalesce(a.ar, c.rating) as avg_rating, coalesce(a.rc, 0) as review_count,
    case
      when lower(c.name_en) = lower(q) or c.name_ar = q then 1
      when c.name_en ilike q || '%' or c.name_ar like q || '%' then 2
      when c.name_en ilike '%' || q || '%' or c.name_ar like '%' || q || '%' then 3
      else 4
    end as rank
  from companies c
  left join agg a on a.target_id = c.id
  left join categories k on k.id = c.category_id
  where c.active = true and (
    c.name_en ilike '%' || q || '%' or c.name_ar like '%' || q || '%'
    or similarity(coalesce(c.name_en,''), q) > 0.15
    or similarity(coalesce(c.name_ar,''), q) > 0.15
    or (k.name_en ilike '%' || q || '%') or (k.name_ar like '%' || q || '%')
    or (c.location ilike '%' || q || '%')
  )
  order by rank asc, coalesce(a.ar, c.rating, 0) desc, c.name_en asc
  limit greatest(1, least(coalesce(p_limit,25), 50)) offset greatest(0, coalesce(p_offset,0));
end $$;

create or replace function haversine_km(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision language plpgsql immutable as $$
declare r constant double precision := 6371.0;
    dlat double precision := radians(coalesce(b_lat,0) - coalesce(a_lat,0));
    dlng double precision := radians(coalesce(b_lng,0) - coalesce(a_lng,0));
    a double precision;
begin
  if a_lat is null or a_lng is null or b_lat is null or b_lng is null then return null; end if;
  a := sin(dlat/2)^2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlng/2)^2;
  return round((2 * r * asin(sqrt(a)))::numeric, 1);
end $$;

create or replace function search_places(p_q text, p_limit int default 25, p_offset int default 0)
returns table (
  kind text, id uuid, name_ar text, name_en text, location text,
  lat double precision, lng double precision, image_url text,
  avg_rating numeric, review_count bigint, rank int
) language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q,''));
begin
  if q = '' then return; end if;
  return query
  with agg as (
    select r.target_id, round(avg(r.rating)::numeric,1) as ar, count(*)::bigint as rc
    from reviews r where r.target_type in ('company','monument','event') group by r.target_id
  ),
  base as (
    select 'company'::text as kind, c.id, c.name_ar, c.name_en, c.location, c.lat, c.lng,
      coalesce(c.cover_url, c.logo_url) as image_url, c.rating,
      (c.active = true) as visible
    from companies c
    union all
    select 'monument'::text, m.id, m.name_ar, m.name_en, m.location, m.lat, m.lng,
      m.image_url, m.rating, true
    from monuments m
    union all
    select 'event'::text, e.id, e.title_ar, e.title_en, e.location, e.lat, e.lng,
      e.image_url, null::numeric, (e.active = true)
    from events e
  )
  select b.kind, b.id, b.name_ar, b.name_en, b.location, b.lat, b.lng, b.image_url,
    coalesce(a.ar, b.rating) as avg_rating, coalesce(a.rc, 0) as review_count,
    case
      when lower(b.name_en) = lower(q) or b.name_ar = q then 1
      when b.name_en ilike q || '%' or b.name_ar like q || '%' then 2
      when b.name_en ilike '%' || q || '%' or b.name_ar like '%' || q || '%' then 3
      else 4
    end as rank
  from base b
  left join agg a on a.target_id = b.id
  where b.visible and (
    b.name_en ilike '%' || q || '%' or b.name_ar like '%' || q || '%'
    or coalesce(b.location,'') ilike '%' || q || '%'
    or word_similarity(lower(q), lower(coalesce(b.name_en,''))) > 0.35
    or word_similarity(lower(q), lower(coalesce(b.name_ar,''))) > 0.35
    or similarity(lower(q), lower(coalesce(b.name_en,''))) > 0.12
    or similarity(lower(q), lower(coalesce(b.name_ar,''))) > 0.12
  )
  order by rank asc, coalesce(a.ar, b.rating, 0) desc, b.name_en asc
  limit greatest(1, least(coalesce(p_limit,25), 50)) offset greatest(0, coalesce(p_offset,0));
end $$;

create or replace function make_promo_code()
returns text language sql volatile set search_path = public as $$
  select 'EARTH-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 3)) || '-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 3));
$$;

create or replace function buy_store_item(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item record;
  v_bal int := 0;
  v_code text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_item from store_items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.active = false then raise exception 'Item unavailable'; end if;
  select points into v_bal from loyalty_wallets where user_id = v_user for update;
  if coalesce(v_bal, 0) < v_item.points_cost then raise exception 'Not enough points'; end if;
  update loyalty_wallets set points = points - v_item.points_cost, updated_at = now() where user_id = v_user;
  v_code := make_promo_code();
  insert into coupons (code, user_id, store_item_id, kind, value, status)
  values (v_code, v_user, v_item.id, v_item.kind, v_item.value, 'active');
  insert into loyalty_ledger (user_id, company_id, points, kind, note)
  values (v_user, null, -v_item.points_cost, 'redeem', 'Store: ' || v_item.title_en);
  select points into v_bal from loyalty_wallets where user_id = v_user;
  return jsonb_build_object('code', v_code, 'balance', v_bal);
end $$;

create or replace function mint_store_codes(p_item_id uuid, p_count int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item record;
  n int := least(greatest(coalesce(p_count, 10), 1), 100);
  codes text[] := '{}';
  c text;
  tries int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_item from store_items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.active = false then raise exception 'Activate the item first'; end if;
  for i in 1..n loop
    tries := 0;
    loop
      c := make_promo_code();
      begin
        insert into coupons (code, user_id, store_item_id, kind, value, status)
        values (c, auth.uid(), v_item.id, v_item.kind, v_item.value, 'active');
        exit;
      exception when unique_violation then
        tries := tries + 1;
        if tries > 5 then raise exception 'Code collision, please retry'; end if;
      end;
    end loop;
    codes := codes || c;
  end loop;
  return jsonb_build_object('codes', to_jsonb(codes), 'count', n);
end $$;

create or replace function loyalty_scan(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_comp record;
  v_award int;
  v_balance int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_comp from companies where qr_token = nullif(trim(coalesce(p_token, '')), '') and active = true;
  if not found then raise exception 'Unknown or inactive QR code'; end if;
  if exists (
    select 1 from loyalty_ledger
    where user_id = v_user and company_id = v_comp.id and kind = 'earn'
  ) then
    raise exception 'This QR was already scanned - each store QR can be used once';
  end if;
  v_award := greatest(1, coalesce(v_comp.qr_points, coalesce((select value::int from app_settings where key = 'loyalty_points_per_scan'), 10)));
  insert into loyalty_wallets (user_id, points, updated_at)
  values (v_user, v_award, now())
  on conflict (user_id) do update set points = loyalty_wallets.points + v_award, updated_at = now();
  insert into loyalty_ledger (user_id, company_id, points, kind, note)
  values (v_user, v_comp.id, v_award, 'earn', 'QR scan');
  select points into v_balance from loyalty_wallets where user_id = v_user;
  return jsonb_build_object('awarded', v_award, 'balance', v_balance, 'company_name', v_comp.name_en);
end $$;

create or replace function public.refresh_review_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_target uuid := coalesce(new.target_id, old.target_id);
  v_type text := coalesce(new.target_type, old.target_type);
  v_avg numeric;
begin
  select round(avg(rating)::numeric, 2) into v_avg
  from reviews where target_type = v_type and target_id = v_target;
  if v_type = 'monument' then
    update monuments set rating = v_avg, updated_at = now() where id = v_target;
  elsif v_type = 'event' then
    update events set rating = v_avg, updated_at = now() where id = v_target;
  elsif v_type = 'company' then
    update companies set rating = v_avg, updated_at = now() where id = v_target;
  elsif v_type = 'service' then
    update services set rating = v_avg, updated_at = now() where id = v_target;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_refresh_review_rating on reviews;
create trigger trg_refresh_review_rating
after insert or update of rating or delete on reviews
for each row execute function public.refresh_review_rating();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, email, username, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name',''),
    coalesce(new.raw_user_meta_data->>'last_name',''),
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,'user'),'@',1) || substr(new.id::text,1,4)),
    'en'
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function admin_set_booking_status(p_booking_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare b record; nm text;
begin
  if not public.has_permission('manage_bookings') then raise exception 'Forbidden'; end if;
  if p_status not in ('pending','confirmed','cancelled','completed','expired','rejected') then raise exception 'Invalid status'; end if;
  select * into b from bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  update bookings set status = p_status, updated_at = now() where id = p_booking_id;
  select coalesce(first_name,'admin') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description)
  values (auth.uid(), coalesce(nm,'admin'), 'booking ' || p_status, 'booking', p_booking_id::text, b.booking_reference, 'Status -> ' || p_status);
  insert into notifications (user_id, title, body, type)
  values (b.user_id,
    case when p_status='confirmed' then 'Booking confirmed' when p_status='rejected' then 'Booking rejected' else 'Booking ' || p_status end,
    'Your booking ' || b.booking_reference || ' is now ' || p_status || '.', 'booking');
end $$;

create or replace function admin_set_promotion_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.has_permission('manage_promotions') then raise exception 'Forbidden'; end if;
  if p_status not in ('active','scheduled','expired','cancelled') then raise exception 'Invalid'; end if;
  update event_promotions set status = p_status, updated_at = now() where id = p_id;
  select coalesce(first_name,'admin') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, description)
  values (auth.uid(), coalesce(nm,'admin'), 'promotion ' || p_status, 'event_promotion', p_id::text, 'Status -> ' || p_status);
end $$;

create or replace function admin_set_support_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.has_permission('manage_support_pricing') then raise exception 'Forbidden'; end if;
  if p_status not in ('active','scheduled','expired','cancelled','used','pending_allocation') then raise exception 'Invalid'; end if;
  update event_support_discounts set status = p_status, updated_at = now() where id = p_id;
  select coalesce(first_name,'admin') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, description)
  values (auth.uid(), coalesce(nm,'admin'), 'support discount ' || p_status, 'event_support_discount', p_id::text, 'Status -> ' || p_status);
end $$;

create or replace function admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o jsonb;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'companies', (select count(*) from companies),
    'services', (select count(*) from services),
    'events', (select count(*) from events),
    'bookings', (select count(*) from bookings),
    'pending_bookings', (select count(*) from bookings where status='pending'),
    'confirmed_bookings', (select count(*) from bookings where status='confirmed'),
    'revenue', coalesce((select sum(final_price) from bookings where status in ('confirmed','completed')),0),
    'active_services', (select count(*) from services where available=true),
    'active_promotions', (select count(*) from event_promotions where status='active'),
    'active_support', (select count(*) from event_support_discounts where status='active'),
    'pending_support', (select count(*) from event_support_discounts where status='pending_allocation')
  ) into o;
  return o;
end $$;

create or replace function boss_list_admins()
returns table (user_id uuid, email text, role text, is_active boolean) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_boss() then raise exception 'Boss only'; end if;
  return query select ur.user_id, p.email, ur.role, (ur.role in ('admin','boss_admin')) as is_active
    from user_roles ur left join profiles p on p.id = ur.user_id where ur.role in ('admin','boss_admin') order by ur.created_at desc;
end $$;

create or replace function boss_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.is_boss() then raise exception 'Boss only'; end if;
  if p_role not in ('user','admin','boss_admin') then raise exception 'Invalid role'; end if;
  update user_roles set role = p_role, updated_at = now() where user_id = p_user_id;
  if not found then insert into user_roles (user_id, role) values (p_user_id, p_role); end if;
  select coalesce(first_name,'boss') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, description)
  values (auth.uid(), coalesce(nm,'boss'), 'role changed to ' || p_role, 'user_role', p_user_id::text, p_role);
end $$;

create or replace function expire_stale() returns void language plpgsql security definer set search_path = public as $$
begin
  update event_promotions set status='expired', updated_at=now() where status in ('active','scheduled') and end_at is not null and end_at < now();
  update event_support_discounts set status='expired', updated_at=now() where status in ('active','scheduled') and end_at is not null and end_at < now();
end $$;

-- pricing engine (latest bands) + event allocator (latest bands) + overbooking support + booking (no cap)
create or replace function calculate_price_quote(p_service_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  sv record; rl record;
  cap numeric(7,2) := 0; inc numeric(7,2) := 0;
  thr jsonb; t jsonb;
  inc_amt numeric(12,2) := 0; dyn numeric(12,2) := 0;
  sup_pct numeric(7,2) := 0; sup_amt numeric(12,2) := 0; fin numeric(12,2) := 0;
  sup record;
  v_kind text;
  v_base numeric(12,2);
  v_citizen boolean := false;
begin
  select * into sv from services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;
  select user_kind into v_kind from profiles where id = auth.uid();
  if v_kind = 'citizen' and sv.citizen_price is not null then
    v_base := sv.citizen_price;
    v_citizen := true;
  else
    v_base := sv.base_price;
  end if;
  select * into rl from pricing_rules where service_id = p_service_id;
  if sv.max_booking > 0 then cap := round((sv.current_booking::numeric / sv.max_booking::numeric) * 100, 2); else cap := 0; end if;
  thr := coalesce(rl.booking_thresholds, '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb);
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if rl.enabled = false then inc := 0; end if;
  if inc > coalesce(sv.max_price_increase_percentage, inc) then inc := sv.max_price_increase_percentage; end if;
  if rl.max_increase_percentage is not null and inc > rl.max_increase_percentage then inc := rl.max_increase_percentage; end if;
  inc_amt := round((v_base * inc / 100)::numeric, 2);
  dyn := round((v_base + inc_amt)::numeric, 2);
  if sv.discount_enabled then sup_pct := least(coalesce(sv.current_discount_percentage,0), coalesce(rl.maximum_support_discount_percentage,30)); end if;
  sup_amt := round((dyn * sup_pct / 100)::numeric, 2);
  fin := greatest(round((dyn - sup_amt)::numeric,2), 0);
  return jsonb_build_object(
    'service_id', sv.id, 'base_price', v_base, 'currency', sv.currency,
    'is_citizen_price', v_citizen,
    'capacity_percentage', cap, 'price_increase_percentage', inc,
    'price_increase_amount', inc_amt, 'dynamic_price', dyn,
    'support_discount_percentage', sup_pct, 'support_discount_amount', sup_amt,
    'final_price', fin, 'current_booking', sv.current_booking, 'max_booking', sv.max_booking
  );
end $$;

create or replace function allocate_support_discount(p_source_event_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  src record; rl record;
  cap numeric(7,2); inc numeric(7,2) := 0; thr jsonb; t jsonb;
  radius numeric := 25; maxd numeric := 30; minc numeric := 0; maxc numeric := 70;
  tgt record; dist numeric; did uuid;
begin
  select * into src from events where id = p_source_event_id;
  if not found then raise exception 'Source event not found'; end if;
  select (value->>'radiusKm')::numeric into radius from app_settings where key = 'support_defaults';
  radius := coalesce(radius, 25); maxd := 30; minc := 0; maxc := 70;
  if src.capacity is null or src.capacity <= 0 then
    insert into event_support_discounts (source_event_id, discount_percentage, status) values (src.id, 0, 'pending_allocation') returning id into did;
    return did;
  end if;
  select count(*)::numeric into cap from bookings where source_event_id = src.id and status in ('pending','confirmed');
  cap := round((cap / src.capacity) * 100, 2);
  thr := '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb;
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if inc <= 0 then
    insert into event_support_discounts (source_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (src.id, cap, 0, 0, 'expired') returning id into did;
    return did;
  end if;
  if inc > maxd then inc := maxd; end if;
  select e.*, haversine_km(src.lat, src.lng, e.lat, e.lng) as d,
    (select count(*) from event_support_discounts s where s.target_event_id = e.id and s.status='active') as got,
    (select count(*) from bookings b join services sv on sv.id=b.service_id where b.status in ('pending','confirmed') and sv.company_id in (select id from companies where location = e.location)) as cur
    into tgt
  from events e
  where e.id <> src.id and e.active = true
    and (e.end_at is null or e.end_at >= now())
    and e.lat is not null
    and haversine_km(src.lat, src.lng, e.lat, e.lng) <= radius
  order by got asc, d asc nulls last
  limit 1;
  if tgt.id is null then
    insert into event_support_discounts (source_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (src.id, cap, inc, inc, 'pending_allocation') returning id into did;
    return did;
  end if;
  insert into event_support_discounts (source_event_id, target_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, distance_km, status, start_at, end_at)
  values (src.id, tgt.id, cap, inc, least(inc, maxd), tgt.d, 'active', now(), now() + interval '48 hours')
  returning id into did;
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description, metadata)
  values (auth.uid(), 'system', 'support discount allocated', 'event_support_discount', did::text, src.title_en, 'Auto allocation', jsonb_build_object('source', src.id, 'target', tgt.id, 'distance_km', tgt.d, 'discount', inc));
  return did;
end $$;

create or replace function allocate_support_from_service(p_service_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  sv record; clat double precision; clng double precision;
  cap numeric(7,2) := 0; inc numeric(7,2) := 0;
  thr jsonb := '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb;
  t jsonb; tgt record; did uuid; radius numeric := 25;
begin
  select * into sv from services where id = p_service_id;
  if not found then return null; end if;
  select lat, lng into clat, clng from companies where id = sv.company_id;
  if clat is null or clng is null then return null; end if;
  if coalesce(sv.max_booking, 0) > 0 then
    cap := round((sv.current_booking::numeric / sv.max_booking::numeric) * 100, 2);
  end if;
  if cap < 100 then return null; end if;
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if inc <= 0 then return null; end if;
  select e.*,
    (select count(*) from event_support_discounts s where s.target_event_id = e.id and s.status = 'active') as got,
    haversine_km(clat, clng, e.lat, e.lng) as d
    into tgt
  from events e
  where e.active = true
    and (e.end_at is null or e.end_at >= now())
    and e.lat is not null
    and haversine_km(clat, clng, e.lat, e.lng) <= radius
  order by got asc, d asc nulls last
  limit 1;
  if tgt.id is null then
    insert into event_support_discounts (source_service_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (sv.id, cap, inc, inc, 'pending_allocation') returning id into did;
    return did;
  end if;
  select id into did from event_support_discounts
  where source_service_id = sv.id and status = 'active' order by created_at desc limit 1;
  if did is not null then
    update event_support_discounts set
      target_event_id = tgt.id,
      source_capacity_percentage = cap,
      source_price_increase_percentage = inc,
      discount_percentage = inc,
      distance_km = tgt.d,
      start_at = now(), end_at = now() + interval '48 hours', updated_at = now()
    where id = did;
  else
    insert into event_support_discounts (source_service_id, target_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, distance_km, status, start_at, end_at)
    values (sv.id, tgt.id, cap, inc, inc, tgt.d, 'active', now(), now() + interval '48 hours')
    returning id into did;
  end if;
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description, metadata)
  values (auth.uid(), 'system', 'overbooking support allocated', 'event_support_discount', did::text, sv.name_en, 'Auto allocation', jsonb_build_object('service', sv.id, 'target', tgt.id, 'distance_km', tgt.d, 'discount', inc));
  return did;
end $$;

create or replace function create_booking(p_service_id uuid, p_booking_date timestamptz, p_quantity int, p_redeem_points int default 0, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sv record; q jsonb;
  qty int := greatest(1, coalesce(p_quantity,1));
  ref text; bid uuid;
  per_unit numeric(12,2); total numeric(12,2);
  v_rate numeric := coalesce((select value::numeric from app_settings where key = 'loyalty_currency_per_point'), 0.05);
  v_min int := coalesce((select value::int from app_settings where key = 'loyalty_min_redeem'), 50);
  v_req int := greatest(0, coalesce(p_redeem_points, 0));
  v_bal int := 0;
  v_used int := 0;
  v_disc numeric(12,2) := 0;
  v_code text := nullif(trim(coalesce(p_coupon_code, '')), '');
  v_cpn record;
  v_cpn_id uuid := null;
  v_cdisc numeric(12,2) := 0;
  v_cap numeric(7,2) := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into sv from services where id = p_service_id for update;
  if not found then raise exception 'Service not found'; end if;
  if sv.available = false then raise exception 'Service unavailable'; end if;
  if sv.available_from is not null and p_booking_date < sv.available_from then raise exception 'Service not yet available'; end if;
  if sv.available_until is not null and p_booking_date > sv.available_until then raise exception 'Service expired'; end if;
  q := calculate_price_quote(p_service_id);
  per_unit := (q->>'final_price')::numeric;
  total := round((per_unit * qty)::numeric, 2);
  ref := 'JOR-' || to_char(now(),'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text),1,6));
  if v_req > 0 then
    if v_req < v_min then raise exception 'Minimum % points to redeem', v_min; end if;
    select points into v_bal from loyalty_wallets where user_id = auth.uid() for update;
    if coalesce(v_bal, 0) < v_req then raise exception 'Not enough points'; end if;
    v_disc := least(round((v_req * v_rate)::numeric, 2), total);
    v_used := floor((v_disc / nullif(v_rate, 0))::numeric);
    if v_used <= 0 then raise exception 'Points value too small for this booking'; end if;
    update loyalty_wallets set points = points - v_used, updated_at = now() where user_id = auth.uid();
    insert into loyalty_ledger (user_id, company_id, points, kind, note)
    values (auth.uid(), sv.company_id, -v_used, 'redeem', 'Booking ' || ref);
    total := round((total - v_disc)::numeric, 2);
  end if;
  if v_code is not null then
    select * into v_cpn from coupons where code = v_code for update;
    if not found then raise exception 'Coupon not found'; end if;
    if v_cpn.user_id != auth.uid() then raise exception 'This coupon belongs to another account'; end if;
    if v_cpn.status != 'active' then raise exception 'Coupon already used'; end if;
    if v_cpn.kind = 'percent' then
      v_cdisc := round((total * least(v_cpn.value, 100) / 100)::numeric, 2);
    else
      v_cdisc := least(v_cpn.value, total);
    end if;
    v_cpn_id := v_cpn.id;
    total := round((total - v_cdisc)::numeric, 2);
  end if;
  insert into bookings (user_id, service_id, company_id, booking_date, quantity, base_price,
    capacity_percentage, price_increase_percentage, price_increase_amount, dynamic_price,
    support_discount_percentage, support_discount_amount, final_price, currency, status, booking_reference,
    points_redeemed, loyalty_discount_amount, coupon_id, coupon_discount_amount)
  values (auth.uid(), sv.id, sv.company_id, p_booking_date, qty, (q->>'base_price')::numeric,
    (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, (q->>'price_increase_amount')::numeric, (q->>'dynamic_price')::numeric,
    (q->>'support_discount_percentage')::numeric, round(((q->>'support_discount_amount')::numeric * qty)::numeric,2), total, sv.currency, 'pending', ref,
    v_used, v_disc, v_cpn_id, v_cdisc)
  returning id into bid;
  if v_cpn_id is not null then
    update coupons set status = 'used', used_at = now(), booking_id = bid where id = v_cpn_id;
  end if;
  update services set current_booking = current_booking + qty, current_price = (q->>'dynamic_price')::numeric, updated_at = now() where id = sv.id;
  begin
    if sv.max_booking > 0 then
      v_cap := round(((sv.current_booking + qty)::numeric / sv.max_booking::numeric) * 100, 2);
    end if;
    if v_cap >= 100 then
      perform allocate_support_from_service(sv.id);
    end if;
  exception when others then null;
  end;
  insert into service_price_history (service_id, old_price, new_price, booking_percentage, price_increase_percentage, reason, changed_by)
  values (sv.id, sv.current_price, (q->>'dynamic_price')::numeric, (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, 'booking', auth.uid());
  insert into notifications (user_id, title, body, type)
  values (auth.uid(), 'Booking received', 'Your booking ' || ref || ' is pending confirmation.', 'booking');
  return jsonb_build_object('booking_id', bid, 'booking_reference', ref, 'final_price', total, 'currency', sv.currency, 'status', 'pending', 'points_redeemed', v_used, 'loyalty_discount', v_disc, 'coupon_discount', v_cdisc);
end $$;

-- ============ 7. STORAGE BUCKETS ============
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('monuments', 'monuments', true),
  ('events', 'events', true),
  ('companies', 'companies', true),
  ('services', 'services', true),
  ('categories', 'categories', true)
on conflict (id) do nothing;

-- ============ 8. DEFAULT SETTINGS + ROLE PERMISSIONS (functional rows only) ============
insert into app_settings (key, value) values
  ('loyalty_points_per_scan', '10'),
  ('loyalty_cooldown_hours', '24'),
  ('loyalty_currency_per_point', '0.05'),
  ('loyalty_min_redeem', '50'),
  ('support_defaults', '{"radiusKm": 25, "maxDiscount": 30, "durationHours": 48}'::jsonb)
on conflict (key) do nothing;
insert into app_settings (key, value) values
  ('pricing_thresholds', '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb)
on conflict (key) do update set value = excluded.value;

insert into role_permissions (role, permission) values
  ('admin','manage_companies'),('admin','manage_events'),('admin','manage_services'),
  ('admin','manage_bookings'),('admin','manage_prices'),('admin','manage_discounts'),
  ('admin','manage_promotions'),('admin','manage_support_pricing'),
  ('admin','view_reviews'),('admin','view_own_logs'),('admin','manage_settings'),
  ('boss_admin','manage_companies'),('boss_admin','manage_events'),('boss_admin','manage_services'),
  ('boss_admin','manage_bookings'),('boss_admin','manage_prices'),('boss_admin','manage_discounts'),
  ('boss_admin','manage_promotions'),('boss_admin','manage_support_pricing'),
  ('boss_admin','view_reviews'),('boss_admin','view_own_logs'),('boss_admin','view_all_logs'),
  ('boss_admin','manage_administrators'),('boss_admin','manage_settings')
on conflict (role, permission) do nothing;

-- ============ 9. CONTENT BACKFILLS (guarded, safe to re-run) ============
-- governorates from lat/lng
update companies set governorate = case
  when lat between 32.20 and 32.45 and lng between 35.60 and 35.95 then 'ajloun'
  when lat between 32.10 and 32.40 and lng between 35.75 and 36.05 then 'jerash'
  when lat between 32.35 and 32.80 and lng between 35.60 and 36.05 then 'irbid'
  when lat between 31.85 and 32.20 and lng between 35.55 and 35.95 then 'balqa'
  when lat between 31.55 and 31.90 and lng between 35.60 and 36.00 then 'madaba'
  when lat between 31.60 and 32.15 and lng between 35.70 and 36.35 then 'amman'
  when lat between 31.60 and 32.30 and lng between 36.00 and 37.60 then 'zarqa'
  when lat between 30.95 and 31.55 and lng between 35.50 and 36.10 then 'karak'
  when lat between 30.60 and 31.10 and lng between 35.40 and 35.90 then 'tafilah'
  when lat between 29.80 and 31.10 and lng between 35.00 and 37.60 then 'maan'
  when lat between 29.20 and 29.90 and lng between 34.90 and 35.40 then 'aqaba'
  when lat between 31.80 and 33.40 and lng between 36.00 and 39.30 then 'mafraq'
  else null end
where governorate is null and lat is not null and lng is not null;

update events set governorate = case
  when lat between 32.20 and 32.45 and lng between 35.60 and 35.95 then 'ajloun'
  when lat between 32.10 and 32.40 and lng between 35.75 and 36.05 then 'jerash'
  when lat between 32.35 and 32.80 and lng between 35.60 and 36.05 then 'irbid'
  when lat between 31.85 and 32.20 and lng between 35.55 and 35.95 then 'balqa'
  when lat between 31.55 and 31.90 and lng between 35.60 and 36.00 then 'madaba'
  when lat between 31.60 and 32.15 and lng between 35.70 and 36.35 then 'amman'
  when lat between 31.60 and 32.30 and lng between 36.00 and 37.60 then 'zarqa'
  when lat between 30.95 and 31.55 and lng between 35.50 and 36.10 then 'karak'
  when lat between 30.60 and 31.10 and lng between 35.40 and 35.90 then 'tafilah'
  when lat between 29.80 and 31.10 and lng between 35.00 and 37.60 then 'maan'
  when lat between 29.20 and 29.90 and lng between 34.90 and 35.40 then 'aqaba'
  when lat between 31.80 and 33.40 and lng between 36.00 and 39.30 then 'mafraq'
  else null end
where governorate is null and lat is not null and lng is not null;

-- monument photos (only where missing)
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Al_Deir_Petra.JPG/1280px-Al_Deir_Petra.JPG', updated_at = now()
where name_en = 'Petra' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Mountain_in_Wadi_Rum%2C_Jordan.jpg/1280px-Mountain_in_Wadi_Rum%2C_Jordan.jpg', updated_at = now()
where name_en = 'Wadi Rum' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Oval_Plaza_%28Forum_Romanum%2C_Gerasa_-_Jerash%2C_Jordan%29.jpg/1280px-Oval_Plaza_%28Forum_Romanum%2C_Gerasa_-_Jerash%2C_Jordan%29.jpg', updated_at = now()
where name_en = 'Jerash' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Amman_Citadel.jpg/1280px-Amman_Citadel.jpg', updated_at = now()
where name_en = 'Amman Citadel' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Roman_theater_of_Amman_01.jpg/1280px-Roman_theater_of_Amman_01.jpg', updated_at = now()
where name_en = 'Roman Theatre' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Dead_Sea_beach_00.JPG/1280px-Dead_Sea_beach_00.JPG', updated_at = now()
where name_en = 'Dead Sea' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/AQABA_2.png/1280px-AQABA_2.png', updated_at = now()
where name_en = 'Aqaba' and (image_url is null or image_url = '');
update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Ajloun_Castle.jpg/1280px-Ajloun_Castle.jpg', updated_at = now()
where name_en = 'Ajloun Castle' and (image_url is null or image_url = '');

-- strip [DEMO] leftovers everywhere
update monuments set
  name_en = ltrim(replace(coalesce(name_en, ''), '[DEMO]', '')),
  name_ar = ltrim(replace(coalesce(name_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where name_en like '%[DEMO]%' or name_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';
update companies set
  name_en = ltrim(replace(coalesce(name_en, ''), '[DEMO]', '')),
  name_ar = ltrim(replace(coalesce(name_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where name_en like '%[DEMO]%' or name_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';
update events set
  title_en = ltrim(replace(coalesce(title_en, ''), '[DEMO]', '')),
  title_ar = ltrim(replace(coalesce(title_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where title_en like '%[DEMO]%' or title_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';
update services set
  name_en = ltrim(replace(coalesce(name_en, ''), '[DEMO]', '')),
  name_ar = ltrim(replace(coalesce(name_ar, ''), '[DEMO]', '')),
  description_en = ltrim(replace(coalesce(description_en, ''), '[DEMO]', '')),
  description_ar = ltrim(replace(coalesce(description_ar, ''), '[DEMO]', '')),
  updated_at = now()
where name_en like '%[DEMO]%' or name_ar like '%[DEMO]%'
   or description_en like '%[DEMO]%' or description_ar like '%[DEMO]%';
delete from place_translations
where source_text like '%[DEMO]%' or translated_text like '%[DEMO]%';

-- CATCHUP COMPLETE. Verify with:
-- select 'governorate cols' as check,
--   (select count(*) from information_schema.columns where table_name='companies' and column_name='governorate') as co_gov,
--   (select count(*) from information_schema.columns where table_name='companies' and column_name='parent_company_id') as co_parent,
--   (select count(*) from information_schema.columns where table_name='monuments' and column_name='citizen_price') as mo_cit,
--   (select count(*) from information_schema.columns where table_name='services' and column_name='citizen_price') as sv_cit;

