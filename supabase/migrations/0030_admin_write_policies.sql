-- 0030_admin_write_policies.sql - admins can create/edit/delete monuments & categories.
-- Run once in Supabase SQL Editor.
-- BUG: monuments and categories only had PUBLIC READ policies, so every admin
-- insert/update failed RLS and the app showed "not an administrator".
drop policy if exists "admin all monuments" on monuments;
create policy "admin all monuments" on monuments
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all categories" on categories;
create policy "admin all categories" on categories
  for all using (public.is_admin()) with check (public.is_admin());
