-- 0012_review_rating_trigger.sql — keep header ratings in sync with reviews.
-- Run once in Supabase SQL Editor.
-- Problem: adding a review never updated the parent rating, so pages showed
-- "No reviews" in the header while the review list below had entries.

-- Events/services had no rating column at all — add it.
alter table events add column if not exists rating numeric(3,2);
alter table services add column if not exists rating numeric(3,2);

-- Recompute the parent rating on every review write.
create or replace function public.refresh_review_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_target uuid := coalesce(new.target_id, old.target_id);
  v_type text := coalesce(new.target_type, old.target_type);
  v_avg numeric;
begin
  select round(avg(rating)::numeric, 2) into v_avg
  from reviews where target_type = v_type and target_id = v_target;
  if v_type = 'monument' then
    update monuments set rating = v_avg, updated_at = now() where id = v_target;
  elsif v_type = 'event' then
    update events set rating = v_avg, updated_at = now() where id = v_target;
  elsif v_type = 'company' then
    update companies set rating = v_avg, updated_at = now() where id = v_target;
  elsif v_type = 'service' then
    update services set rating = v_avg, updated_at = now() where id = v_target;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_refresh_review_rating on reviews;
create trigger trg_refresh_review_rating
after insert or update of rating or delete on reviews
for each row execute function public.refresh_review_rating();

-- Backfill existing reviews (fixes headers like Paint Bullet immediately).
update monuments m set rating = q.a, updated_at = now()
from (select target_id, round(avg(rating)::numeric, 2) as a from reviews where target_type = 'monument' group by target_id) q
where q.target_id = m.id;

update events e set rating = q.a, updated_at = now()
from (select target_id, round(avg(rating)::numeric, 2) as a from reviews where target_type = 'event' group by target_id) q
where q.target_id = e.id;

update companies c set rating = q.a, updated_at = now()
from (select target_id, round(avg(rating)::numeric, 2) as a from reviews where target_type = 'company' group by target_id) q
where q.target_id = c.id;

update services s set rating = q.a, updated_at = now()
from (select target_id, round(avg(rating)::numeric, 2) as a from reviews where target_type = 'service' group by target_id) q
where q.target_id = s.id;
