-- 0010_dedupe_places.sql — remove duplicate monuments/categories, prevent recurrence.
-- Run once in Supabase SQL Editor.
-- Context: the seed was applied 2-3x and bare "on conflict do nothing" cannot
-- dedupe without a unique constraint, so every monument (and some categories)
-- exists twice. This keeps ONE row per name and guards the tables.

-- ── 1) Monuments: keep the most-reviewed copy, tie-break earliest created ──
with ranked as (
  select m.id,
    row_number() over (
      partition by lower(trim(m.name_en))
      order by (select count(*) from reviews r where r.target_type = 'monument' and r.target_id = m.id) desc,
               m.created_at asc
    ) as rn
  from monuments m
)
delete from monuments m using ranked r
where m.id = r.id and r.rn > 1;

-- ── 2) Categories: re-point items to the earliest same-named row, then delete dupes ──
with ranked as (
  select id,
    row_number() over (partition by lower(trim(name_en)) order by created_at asc) as rn,
    first_value(id) over (partition by lower(trim(name_en)) order by created_at asc) as keep_id
  from categories
)
update monuments set category_id = ranked.keep_id
from ranked where monuments.category_id = ranked.id and ranked.rn > 1;

with ranked as (
  select id,
    row_number() over (partition by lower(trim(name_en)) order by created_at asc) as rn,
    first_value(id) over (partition by lower(trim(name_en)) order by created_at asc) as keep_id
  from categories
)
update events set category_id = ranked.keep_id
from ranked where events.category_id = ranked.id and ranked.rn > 1;

with ranked as (
  select id,
    row_number() over (partition by lower(trim(name_en)) order by created_at asc) as rn,
    first_value(id) over (partition by lower(trim(name_en)) order by created_at asc) as keep_id
  from categories
)
update companies set category_id = ranked.keep_id
from ranked where companies.category_id = ranked.id and ranked.rn > 1;

with ranked as (
  select id,
    row_number() over (partition by lower(trim(name_en)) order by created_at asc) as rn,
    first_value(id) over (partition by lower(trim(name_en)) order by created_at asc) as keep_id
  from categories
)
update services set category_id = ranked.keep_id
from ranked where services.category_id = ranked.id and ranked.rn > 1;

with ranked as (
  select id,
    row_number() over (partition by lower(trim(name_en)) order by created_at asc) as rn
  from categories
)
delete from categories c using ranked r
where c.id = r.id and r.rn > 1;

-- ── 3) Unique guards: re-running the seed can never duplicate again ──
-- (bare "on conflict do nothing" in 0005_seed.sql now has constraints to hit)
create unique index if not exists monuments_name_en_uidx on monuments (lower(trim(name_en)));
create unique index if not exists categories_name_en_uidx on categories (lower(trim(name_en)));
create unique index if not exists companies_name_en_uidx on companies (lower(trim(name_en)));
create unique index if not exists events_title_en_uidx on events (lower(trim(title_en)));
