-- 0018_profile_currency.sql — tourist display currency + account kind column check.
-- Run once in Supabase SQL Editor.
-- Tourists pick JOD/USD/EUR/GBP/SAR at registration; citizens always JOD.
-- Prices are stored as-is; conversion is display-only (live FX with fallback).
alter table profiles add column if not exists currency text not null default 'JOD';
