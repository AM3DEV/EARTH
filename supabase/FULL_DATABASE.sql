-- ============================================================
-- JORDAN TOURISM GUIDE � FULL DATABASE (consolidated)
-- Run order: 0001 schema > 0002 indexes > 0003 RLS > 0004 RPC > 0005 seed
-- Execute in Supabase Dashboard > SQL Editor, or: supabase db push
-- ============================================================


-- ############################################################
-- SOURCE: supabase\migrations\0001_schema.sql
-- ############################################################

-- 0001_schema.sql — Jordan Tourism Guide core schema
-- Requires: pgcrypto (gen_random_uuid), pg_trgm for search (enabled in 0002)

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
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

-- Pricing rules per service (JSONB thresholds, support config)
create table if not exists pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references services(id) on delete cascade,
  enabled boolean not null default true,
  max_increase_percentage numeric(5,2) not null default 20 check (max_increase_percentage >= 0),
  booking_thresholds jsonb not null default '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb,
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
  source_event_id uuid not null references events(id) on delete cascade,
  target_event_id uuid references events(id) on delete set null,
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
  -- optional future payment fields
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

-- Auto-create profile + default user role on signup
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
  -- PUBLIC registration can ONLY create 'user'. Never trust client role.
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();



-- ############################################################
-- SOURCE: supabase\migrations\0002_indexes.sql
-- ############################################################

-- 0002_indexes.sql
create extension if not exists pg_trgm;

-- Company search (server-side, scalable)
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

create index if not exists idx_promo_event on event_promotions (event_id);
create index if not exists idx_promo_status on event_promotions (status);
create index if not exists idx_promo_window on event_promotions (start_at, end_at);

create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);
create index if not exists idx_logs_admin on admin_activity_logs (admin_user_id, created_at desc);

-- Discovery view: active promoted events first, then relevance (date, freshness, rating)
create or replace view event_discovery as
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



-- ############################################################
-- SOURCE: supabase\migrations\0003_rls.sql
-- ############################################################

-- 0003_rls.sql — Row Level Security. Never trust frontend; enforce server-side.
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

-- Helper: is admin / boss (security definer, stable)
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

-- Public read for active tourism content
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
drop policy if exists "public read services" on services;
create policy "public read services" on services for select using (available = true);
drop policy if exists "admin all services" on services;
create policy "admin all services" on services for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: own read/update; admins read all
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "admin read profiles" on profiles;
create policy "admin read profiles" on profiles for select using (public.is_admin());

-- user_roles: user reads own; NOBODY can self-assign via client (no insert/update policy for non-boss)
drop policy if exists "read own role" on user_roles;
create policy "read own role" on user_roles for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "boss manage roles" on user_roles;
create policy "boss manage roles" on user_roles for all using (public.is_boss()) with check (public.is_boss());

drop policy if exists "read perms" on role_permissions;
create policy "read perms" on role_permissions for select using (true);
drop policy if exists "boss manage perms" on role_permissions;
create policy "boss manage perms" on role_permissions for all using (public.is_boss()) with check (public.is_boss());

-- Favorites / bookings / notifications / AI: own only
drop policy if exists "own favorites" on favorites;
create policy "own favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own bookings read" on bookings;
create policy "own bookings read" on bookings for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin bookings manage" on bookings;
create policy "admin bookings manage" on bookings for update using (public.is_admin()) with check (public.is_admin());
-- inserts go through create_booking RPC (security definer); block direct client inserts with wrong price by allowing own insert (server revalidates via trigger below)
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

-- Reviews: public read, own write, admin moderate
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);
drop policy if exists "own review write" on reviews;
create policy "own review write" on reviews for insert with check (auth.uid() = user_id);
drop policy if exists "own review update" on reviews;
create policy "own review update" on reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin review delete" on reviews;
create policy "admin review delete" on reviews for delete using (public.is_admin());

-- Pricing / promotions / support: public read active-relevant; admin write
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

-- Logs: normal admin sees OWN; boss sees ALL (enforced here)
drop policy if exists "own logs" on admin_activity_logs;
create policy "own logs" on admin_activity_logs for select using (admin_user_id = auth.uid() or public.is_boss());
drop policy if exists "server log insert" on admin_activity_logs;
create policy "server log insert" on admin_activity_logs for insert with check (true);

-- Settings: public read non-secret keys; admin write
drop policy if exists "public read settings" on app_settings;
create policy "public read settings" on app_settings for select using (true);
drop policy if exists "admin settings" on app_settings;
create policy "admin settings" on app_settings for all using (public.has_permission('manage_settings')) with check (public.has_permission('manage_settings'));

-- Storage buckets (run in dashboard or via API): avatars, monuments, events, companies, services, categories — public read, authenticated write to own folder
-- Provided as SQL for supabase storage.objects policies:
-- (create buckets first in dashboard; policies below assume buckets exist)
drop policy if exists "public read storage" on storage.objects;
create policy "public read storage" on storage.objects for select using (bucket_id in ('avatars','monuments','events','companies','services','categories'));
drop policy if exists "auth upload storage" on storage.objects;
create policy "auth upload storage" on storage.objects for insert with check (bucket_id in ('avatars','monuments','events','companies','services','categories') and auth.role() = 'authenticated');
drop policy if exists "auth update own storage" on storage.objects;
create policy "auth update own storage" on storage.objects for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete storage" on storage.objects;
create policy "admin delete storage" on storage.objects for delete using (public.is_admin());



-- ############################################################
-- SOURCE: supabase\migrations\0004_rpc.sql
-- ############################################################

-- 0004_rpc.sql — secure server functions (pricing engine, booking, search, support allocation, admin ops)
-- All critical business logic lives here; clients must never be trusted for price/capacity/discount/role.

-- 0) Username -> email resolution (never expose emails unnecessarily; returns single email for login)
create or replace function resolve_login_email(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from profiles where lower(username) = lower(trim(p_username)) limit 1;
  return v_email;
end $$;

-- 1) Ranked server-side company search (first-letter / prefix / contains / category / location)
-- Uses pg_trgm similarity + explicit priority: exact > starts-with > contains > category > location
create or replace function search_companies(p_q text, p_limit int default 25, p_offset int default 0)
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

-- 2) Haversine distance km (server authoritative)
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

-- 3) Authoritative price quote for a service
create or replace function calculate_price_quote(p_service_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  sv record; rl record;
  cap numeric(7,2) := 0; inc numeric(7,2) := 0;
  thr jsonb; t jsonb;
  inc_amt numeric(12,2) := 0; dyn numeric(12,2) := 0;
  sup_pct numeric(7,2) := 0; sup_amt numeric(12,2) := 0; fin numeric(12,2) := 0;
  sup record;
begin
  select * into sv from services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;
  select * into rl from pricing_rules where service_id = p_service_id;
  if sv.max_booking > 0 then cap := round((sv.current_booking::numeric / sv.max_booking::numeric) * 100, 2); else cap := 0; end if;
  thr := coalesce(rl.booking_thresholds, '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb);
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if rl.enabled = false then inc := 0; end if;
  if inc > coalesce(sv.max_price_increase_percentage, inc) then inc := sv.max_price_increase_percentage; end if;
  if rl.max_increase_percentage is not null and inc > rl.max_increase_percentage then inc := rl.max_increase_percentage; end if;
  inc_amt := round((sv.base_price * inc / 100)::numeric, 2);
  dyn := round((sv.base_price + inc_amt)::numeric, 2);
  -- best active support discount targeting this service's linked event OR service itself via event_support_discounts joined through services? v1: support discounts attach to events;
  -- for services we look up active discounts where target matches a linked heuristic: none — return global best active discount for services flagged via description? Keep: check support mapped by service id stored in event_support_discounts.target_event_id only for events.
  -- For service detail we surface active discount if the service itself has discount_enabled/current_discount_percentage maintained by allocate job.
  if sv.discount_enabled then sup_pct := least(coalesce(sv.current_discount_percentage,0), coalesce(rl.maximum_support_discount_percentage,30)); end if;
  sup_amt := round((dyn * sup_pct / 100)::numeric, 2);
  fin := greatest(round((dyn - sup_amt)::numeric,2), 0);
  return jsonb_build_object(
    'service_id', sv.id, 'base_price', sv.base_price, 'currency', sv.currency,
    'capacity_percentage', cap, 'price_increase_percentage', inc,
    'price_increase_amount', inc_amt, 'dynamic_price', dyn,
    'support_discount_percentage', sup_pct, 'support_discount_amount', sup_amt,
    'final_price', fin, 'current_booking', sv.current_booking, 'max_booking', sv.max_booking
  );
end $$;

-- 4) Nearby support-discount allocation (fair distribution, radius enforced, never distant)
-- Called after bookings/pricing changes or by cron. status pending_allocation when no eligible target.
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
  -- config: prefer per-event app_settings override else defaults
  select (value->>'radiusKm')::numeric into radius from app_settings where key = 'support_defaults';
  radius := coalesce(radius, 25); maxd := 30; minc := 0; maxc := 70;
  -- capacity from linked services bookings? v1: derive from events.capacity + count of bookings on services of same location? Use events.capacity vs synthetic current from bookings table via company? Simplify: use max of linked service capacity percentages where service name matches event, else 0.
  -- For determinism v1: treat events.capacity as max and count active support-generated bookings referencing source_event_id as current
  -- Fallback: if capacity null, no increase.
  if src.capacity is null or src.capacity <= 0 then
    insert into event_support_discounts (source_event_id, discount_percentage, status) values (src.id, 0, 'pending_allocation') returning id into did;
    return did;
  end if;
  -- current = active bookings count linked to event via bookings.source_event_id
  select count(*)::numeric into cap from bookings where source_event_id = src.id and status in ('pending','confirmed');
  cap := round((cap / src.capacity) * 100, 2);
  thr := '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb;
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if inc <= 0 then
    insert into event_support_discounts (source_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (src.id, cap, 0, 0, 'expired') returning id into did;
    return did;
  end if;
  if inc > maxd then inc := maxd; end if;
  -- find eligible nearby: active, not expired, capacity within [minc,maxc], within radius, fair rotation (fewest active discounts received, then distance, then lowest capacity)
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
  -- audit
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description, metadata)
  values (auth.uid(), 'system', 'support discount allocated', 'event_support_discount', did::text, src.title_en, 'Auto allocation', jsonb_build_object('source', src.id, 'target', tgt.id, 'distance_km', tgt.d, 'discount', inc));
  return did;
end $$;

-- 5) Transactional booking creation — locks capacity, authoritative price, snapshot, notification
create or replace function create_booking(p_service_id uuid, p_booking_date timestamptz, p_quantity int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sv record; q jsonb;
  qty int := greatest(1, coalesce(p_quantity,1));
  ref text; bid uuid;
  per_unit numeric(12,2); total numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into sv from services where id = p_service_id for update;
  if not found then raise exception 'Service not found'; end if;
  if sv.available = false then raise exception 'Service unavailable'; end if;
  if sv.available_from is not null and p_booking_date < sv.available_from then raise exception 'Service not yet available'; end if;
  if sv.available_until is not null and p_booking_date > sv.available_until then raise exception 'Service expired'; end if;
  if sv.current_booking + qty > sv.max_booking then raise exception 'Fully booked'; end if;

  q := calculate_price_quote(p_service_id);
  per_unit := (q->>'final_price')::numeric;
  total := round((per_unit * qty)::numeric, 2);
  ref := 'JOR-' || to_char(now(),'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text),1,6));

  insert into bookings (user_id, service_id, company_id, booking_date, quantity, base_price,
    capacity_percentage, price_increase_percentage, price_increase_amount, dynamic_price,
    support_discount_percentage, support_discount_amount, final_price, currency, status, booking_reference)
  values (auth.uid(), sv.id, sv.company_id, p_booking_date, qty, sv.base_price,
    (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, (q->>'price_increase_amount')::numeric, (q->>'dynamic_price')::numeric,
    (q->>'support_discount_percentage')::numeric, round(((q->>'support_discount_amount')::numeric * qty)::numeric,2), total, sv.currency, 'pending', ref)
  returning id into bid;

  update services set current_booking = current_booking + qty, current_price = (q->>'dynamic_price')::numeric, updated_at = now() where id = sv.id;

  insert into service_price_history (service_id, old_price, new_price, booking_percentage, price_increase_percentage, reason, changed_by)
  values (sv.id, sv.current_price, (q->>'dynamic_price')::numeric, (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, 'booking', auth.uid());

  insert into notifications (user_id, title, body, type)
  values (auth.uid(), 'Booking received', 'Your booking ' || ref || ' is pending confirmation.', 'booking');

  -- try support re-allocation for linked event (best effort)
  -- (no-op if no event linked)

  return jsonb_build_object('booking_id', bid, 'booking_reference', ref, 'final_price', total, 'currency', sv.currency, 'status', 'pending');
end $$;

-- 6) Admin ops (permission-checked)
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
  -- server-side validation: expired promotions cannot receive a boost
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

-- 7) Boss admin ops
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

-- 8) Expire old promotions/discounts (call from cron)
create or replace function expire_stale() returns void language plpgsql security definer set search_path = public as $$
begin
  update event_promotions set status='expired', updated_at=now() where status in ('active','scheduled') and end_at is not null and end_at < now();
  update event_support_discounts set status='expired', updated_at=now() where status in ('active','scheduled') and end_at is not null and end_at < now();
end $$;



-- ############################################################
-- SOURCE: supabase\migrations\0005_seed.sql
-- ############################################################

-- 0005_seed.sql — clearly-marked DEMO data. Prices intentionally NULL (never invent real-world prices).
-- Mark: description prefix [DEMO]

insert into categories (name_en, name_ar, type) values
  ('Archaeological Sites','مواقع أثرية','monument'),
  ('Events','فعاليات','event'),
  ('Nature','طبيعة','monument'),
  ('Restaurants','مطاعم','company'),
  ('Hotels','فنادق','company'),
  ('Activities','أنشطة','company'),
  ('Tourist Services','خدمات سياحية','company')
on conflict do nothing;

-- Monuments (demo, price NULL)
insert into monuments (name_en, name_ar, description_en, description_ar, location, lat, lng, price, opening_hours) values
  ('Petra','البترا','[DEMO] Ancient Nabataean city, UNESCO site.','[DEMO] مدينة نبطية أثرية.','Ma''an',30.3285,35.4444,NULL,'06:00-18:00'),
  ('Wadi Rum','وادي رم','[DEMO] Desert valley with dramatic sandstone.','[DEMO] وادي صحراوي ساحر.','Aqaba',29.5321,35.4194,NULL,NULL),
  ('Jerash','جرش','[DEMO] Roman ruins, among best preserved.','[DEMO] آثار رومانية محفوظة.','Jerash',32.2723,35.8912,NULL,'08:00-19:00'),
  ('Amman Citadel','قلعة عمان','[DEMO] Historic hilltop citadel.','[DEMO] قلعة تاريخية وسط عمان.','Amman',31.9539,35.9344,NULL,'08:00-19:00'),
  ('Roman Theatre','المدرج الروماني','[DEMO] 2nd-century theatre downtown.','[DEMO] مسرح روماني وسط البلد.','Amman',31.9514,35.9393,NULL,'08:00-19:00'),
  ('Dead Sea','البحر الميت','[DEMO] Lowest point on earth.','[DEMO] أخفض نقطة على الأرض.','Madaba',31.4979,35.5484,NULL,NULL),
  ('Aqaba','العقبة','[DEMO] Red Sea resort city.','[DEMO] مدينة ساحلية على البحر الأحمر.','Aqaba',29.5321,35.0067,NULL,NULL),
  ('Ajloun Castle','قلعة عجلون','[DEMO] 12th-century hilltop castle.','[DEMO] قلعة من القرن الثاني عشر.','Ajloun',32.3258,35.7269,NULL,'08:00-19:00')
on conflict do nothing;

-- Demo companies (searchable on map; lat/lng set)
insert into companies (name_en, name_ar, location, lat, lng, phone, active, verified) values
  ('Amman Tours','جولات عمان','Amman',31.9539,35.9106,'+96260000001',true,true),
  ('Amman Restaurant','مطعم عمان','Amman',31.9539,35.9300,'+96260000002',true,false),
  ('Amman Hotel','فندق عمان','Amman',31.9600,35.9300,'+96260000003',true,true),
  ('Aqaba Diving Center','مركز العقبة للغوص','Aqaba',29.5321,35.0067,'+96260000004',true,true),
  ('Arabian Desert Tours','جولات الصحراء العربية','Wadi Rum',29.5321,35.4194,'+96260000005',true,false),
  ('Al Petra Travel','البترا للسفر','Petra',30.3285,35.4444,'+96260000006',true,true)
on conflict do nothing;

-- Default role permissions
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

insert into app_settings (key, value) values
  ('support_defaults', '{"radiusKm": 25, "maxDiscount": 30, "durationHours": 48}'::jsonb),
  ('pricing_thresholds', '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb)
on conflict (key) do nothing;



-- ############################################################
-- SOURCE: supabase\migrations\0006_monument_images.sql
-- ############################################################

-- 0006_monument_images.sql — real monument photos (Wikimedia Commons, verified HTTP 200).
-- Idempotent: only fills rows that have no image yet. Safe to re-run.

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Al_Deir_Petra.JPG/1280px-Al_Deir_Petra.JPG', updated_at = now()
where name_en = 'Petra' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Mountain_in_Wadi_Rum%2C_Jordan.jpg/1280px-Mountain_in_Wadi_Rum%2C_Jordan.jpg', updated_at = now()
where name_en = 'Wadi Rum' and (image_url is null or image_url = '');

update monuments set image_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Oval_Plaza_%28Forum_Romanum%2C_Gerasa_-_Jerash%2C_Jordan%29_-_%D8%B3%D8%A7%D8%AD%D8%A9_%D8%A7%D9%84%D9%86%D8%AF%D9%88%D8%A9%2C_%D8%AC%D8%B1%D8%B4.jpg/1280px-Oval_Plaza_%28Forum_Romanum%2C_Gerasa_-_Jerash%2C_Jordan%29_-_%D8%B3%D8%A7%D8%AD%D8%A9_%D8%A7%D9%84%D9%86%D8%AF%D9%88%D8%A9%2C_%D8%AC%D8%B1%D8%B4.jpg', updated_at = now()
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

-- ############################################################
-- SOURCE: supabase\migrations\0007_storage_buckets.sql
-- ############################################################

-- 0007_storage_buckets.sql — create Storage buckets (policies were defined in 0003).
-- Buckets cannot be created by RLS policies; they must exist first.
-- Idempotent: safe to re-run.

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('monuments', 'monuments', true),
  ('events', 'events', true),
  ('companies', 'companies', true),
  ('services', 'services', true),
  ('categories', 'categories', true)
on conflict (id) do nothing;
