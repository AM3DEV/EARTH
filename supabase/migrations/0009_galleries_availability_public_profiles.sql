-- 0009_galleries_availability_public_profiles.sql
-- Run once in Supabase SQL Editor.
-- 1) Multiple pictures: gallery_urls[] on companies, events, services.
-- 2) Booking availability window: available_from / available_to on services
--    (null = open-ended). Enforced client-side + in create_booking (see note).
-- 3) public_profiles: safe reviewer identities (no emails) for review lists.

-- 1) Galleries
alter table companies add column if not exists gallery_urls text[] not null default '{}';
alter table events add column if not exists gallery_urls text[] not null default '{}';
alter table services add column if not exists gallery_urls text[] not null default '{}';

-- 2) Service availability window (single-day services leave these null)
alter table services add column if not exists available_from date;
alter table services add column if not exists available_to date;

-- 3) Public reviewer identities (id + display fields only — never email/phone)
create or replace view public_profiles as
select id, first_name, last_name, username, avatar_url
from profiles;

-- Views don't inherit RLS: grant read explicitly, revoke write by default.
revoke all on public_profiles from public, anon, authenticated;
grant select on public_profiles to anon, authenticated;
