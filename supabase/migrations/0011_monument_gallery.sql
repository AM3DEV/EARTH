-- 0011_monument_gallery.sql — gallery support for monuments (admin MonumentForm).
-- Run once in Supabase SQL Editor.
alter table monuments add column if not exists gallery_urls text[] not null default '{}';
