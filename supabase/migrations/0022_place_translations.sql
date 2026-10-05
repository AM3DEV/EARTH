-- 0022_place_translations.sql - cache for auto-translated descriptions.
-- Run once in Supabase SQL Editor.
-- The translate-text edge function reads/writes this with the service role;
-- no client policies on purpose (tourists never touch it directly).
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
create index if not exists idx_place_translations_lookup on place_translations(place_kind, place_id, lang);
