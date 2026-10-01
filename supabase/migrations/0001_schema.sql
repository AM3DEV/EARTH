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
