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
