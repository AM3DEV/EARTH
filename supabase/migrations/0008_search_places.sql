-- 0008_search_places.sql — unified typo-tolerant search across companies, monuments, events.
-- Run this in Supabase SQL Editor (one time). Replaces client-side use of search_companies
-- for the map search (search_companies is kept for backward compatibility).
--
-- Why: "aljoun" (typo for Ajloun) found nothing because only the companies table
-- was searched and only via substring/similarity. This searches ALL places with:
--   exact > prefix > contains > typo (pg_trgm word_similarity + similarity)

-- 1) Unified place search: companies (active) + monuments + events (active),
--    ranked exact → prefix → contains → typo, then rating, then name.
create or replace function search_places(p_q text, p_limit int default 25, p_offset int default 0)
returns table (
  kind text, id uuid, name_ar text, name_en text, location text,
  lat double precision, lng double precision, image_url text,
  avg_rating numeric, review_count bigint, rank int
) language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q,''));
begin
  if q = '' then return; end if;
  return query
  with agg as (
    select r.target_id, round(avg(r.rating)::numeric,1) as ar, count(*)::bigint as rc
    from reviews r where r.target_type in ('company','monument','event') group by r.target_id
  ),
  base as (
    select 'company'::text as kind, c.id, c.name_ar, c.name_en, c.location, c.lat, c.lng,
      coalesce(c.cover_url, c.logo_url) as image_url, c.rating,
      (c.active = true) as visible
    from companies c
    union all
    select 'monument'::text, m.id, m.name_ar, m.name_en, m.location, m.lat, m.lng,
      m.image_url, m.rating, true
    from monuments m
    union all
    select 'event'::text, e.id, e.title_ar, e.title_en, e.location, e.lat, e.lng,
      e.image_url, null::numeric, (e.active = true)
    from events e
  )
  select b.kind, b.id, b.name_ar, b.name_en, b.location, b.lat, b.lng, b.image_url,
    coalesce(a.ar, b.rating) as avg_rating, coalesce(a.rc, 0) as review_count,
    case
      when lower(b.name_en) = lower(q) or b.name_ar = q then 1
      when b.name_en ilike q || '%' or b.name_ar like q || '%' then 2
      when b.name_en ilike '%' || q || '%' or b.name_ar like '%' || q || '%' then 3
      else 4
    end as rank
  from base b
  left join agg a on a.target_id = b.id
  where b.visible and (
    b.name_en ilike '%' || q || '%' or b.name_ar like '%' || q || '%'
    or coalesce(b.location,'') ilike '%' || q || '%'
    or word_similarity(lower(q), lower(coalesce(b.name_en,''))) > 0.35
    or word_similarity(lower(q), lower(coalesce(b.name_ar,''))) > 0.35
    or similarity(lower(q), lower(coalesce(b.name_en,''))) > 0.12
    or similarity(lower(q), lower(coalesce(b.name_ar,''))) > 0.12
  )
  order by rank asc, coalesce(a.ar, b.rating, 0) desc, b.name_en asc
  limit greatest(1, least(coalesce(p_limit,25), 50)) offset greatest(0, coalesce(p_offset,0));
end $$;
