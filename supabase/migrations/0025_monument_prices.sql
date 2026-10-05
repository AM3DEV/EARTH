-- 0025_monument_prices.sql - tourist + citizen price per monument.
-- Run once in Supabase SQL Editor.
-- price = tourist price; citizen_price null = same as tourist.
alter table monuments add column if not exists citizen_price numeric(12,2)
  check (citizen_price is null or citizen_price >= 0);
