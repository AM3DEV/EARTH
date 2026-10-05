-- 0029_company_prices.sql - tourist + citizen price per company.
-- Run once in Supabase SQL Editor.
-- price = tourist price; citizen_price null = same as tourist; null = free/unset.
alter table companies add column if not exists price numeric(12,2)
  check (price is null or price >= 0);
alter table companies add column if not exists citizen_price numeric(12,2)
  check (citizen_price is null or citizen_price >= 0);
alter table companies add column if not exists currency text default 'JOD';
