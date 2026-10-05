-- 0031_monument_flags.sql - verified + active flags on monuments (like companies).
-- Run once in Supabase SQL Editor.
alter table monuments add column if not exists verified boolean not null default false;
alter table monuments add column if not exists active boolean not null default true;
