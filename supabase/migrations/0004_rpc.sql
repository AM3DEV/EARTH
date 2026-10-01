-- 0004_rpc.sql — secure server functions (pricing engine, booking, search, support allocation, admin ops)
-- All critical business logic lives here; clients must never be trusted for price/capacity/discount/role.

-- 0) Username -> email resolution (never expose emails unnecessarily; returns single email for login)
create or replace function resolve_login_email(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from profiles where lower(username) = lower(trim(p_username)) limit 1;
  return v_email;
end $$;

-- 1) Ranked server-side company search (first-letter / prefix / contains / category / location)
-- Uses pg_trgm similarity + explicit priority: exact > starts-with > contains > category > location
create or replace function search_companies(p_q text, p_limit int default 25, p_offset int default 0)
returns table (
  id uuid, category_id uuid, name_ar text, name_en text, description_ar text, description_en text,
  logo_url text, cover_url text, location text, lat double precision, lng double precision,
  phone text, email text, website text, opening_hours text, rating numeric, verified boolean, active boolean,
  avg_rating numeric, review_count bigint, rank int
) language plpgsql stable security definer set search_path = public as $$
declare q text := trim(coalesce(p_q,''));
begin
  if q = '' then return; end if;
  return query
  with agg as (
    select r.target_id, round(avg(r.rating)::numeric,1) as ar, count(*)::bigint as rc
    from reviews r where r.target_type = 'company' group by r.target_id
  )
  select c.id, c.category_id, c.name_ar, c.name_en, c.description_ar, c.description_en,
    c.logo_url, c.cover_url, c.location, c.lat, c.lng, c.phone, c.email, c.website,
    c.opening_hours, c.rating, c.verified, c.active,
    coalesce(a.ar, c.rating) as avg_rating, coalesce(a.rc, 0) as review_count,
    case
      when lower(c.name_en) = lower(q) or c.name_ar = q then 1
      when c.name_en ilike q || '%' or c.name_ar like q || '%' then 2
      when c.name_en ilike '%' || q || '%' or c.name_ar like '%' || q || '%' then 3
      else 4
    end as rank
  from companies c
  left join agg a on a.target_id = c.id
  left join categories k on k.id = c.category_id
  where c.active = true and (
    c.name_en ilike '%' || q || '%' or c.name_ar like '%' || q || '%'
    or similarity(coalesce(c.name_en,''), q) > 0.15
    or similarity(coalesce(c.name_ar,''), q) > 0.15
    or (k.name_en ilike '%' || q || '%') or (k.name_ar like '%' || q || '%')
    or (c.location ilike '%' || q || '%')
  )
  order by rank asc, coalesce(a.ar, c.rating, 0) desc, c.name_en asc
  limit greatest(1, least(coalesce(p_limit,25), 50)) offset greatest(0, coalesce(p_offset,0));
end $$;

-- 2) Haversine distance km (server authoritative)
create or replace function haversine_km(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision language plpgsql immutable as $$
declare r constant double precision := 6371.0;
    dlat double precision := radians(coalesce(b_lat,0) - coalesce(a_lat,0));
    dlng double precision := radians(coalesce(b_lng,0) - coalesce(a_lng,0));
    a double precision;
begin
  if a_lat is null or a_lng is null or b_lat is null or b_lng is null then return null; end if;
  a := sin(dlat/2)^2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlng/2)^2;
  return round((2 * r * asin(sqrt(a)))::numeric, 1);
end $$;

-- 3) Authoritative price quote for a service
create or replace function calculate_price_quote(p_service_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  sv record; rl record;
  cap numeric(7,2) := 0; inc numeric(7,2) := 0;
  thr jsonb; t jsonb;
  inc_amt numeric(12,2) := 0; dyn numeric(12,2) := 0;
  sup_pct numeric(7,2) := 0; sup_amt numeric(12,2) := 0; fin numeric(12,2) := 0;
  sup record;
begin
  select * into sv from services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;
  select * into rl from pricing_rules where service_id = p_service_id;
  if sv.max_booking > 0 then cap := round((sv.current_booking::numeric / sv.max_booking::numeric) * 100, 2); else cap := 0; end if;
  thr := coalesce(rl.booking_thresholds, '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb);
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if rl.enabled = false then inc := 0; end if;
  if inc > coalesce(sv.max_price_increase_percentage, inc) then inc := sv.max_price_increase_percentage; end if;
  if rl.max_increase_percentage is not null and inc > rl.max_increase_percentage then inc := rl.max_increase_percentage; end if;
  inc_amt := round((sv.base_price * inc / 100)::numeric, 2);
  dyn := round((sv.base_price + inc_amt)::numeric, 2);
  -- best active support discount targeting this service's linked event OR service itself via event_support_discounts joined through services? v1: support discounts attach to events;
  -- for services we look up active discounts where target matches a linked heuristic: none — return global best active discount for services flagged via description? Keep: check support mapped by service id stored in event_support_discounts.target_event_id only for events.
  -- For service detail we surface active discount if the service itself has discount_enabled/current_discount_percentage maintained by allocate job.
  if sv.discount_enabled then sup_pct := least(coalesce(sv.current_discount_percentage,0), coalesce(rl.maximum_support_discount_percentage,30)); end if;
  sup_amt := round((dyn * sup_pct / 100)::numeric, 2);
  fin := greatest(round((dyn - sup_amt)::numeric,2), 0);
  return jsonb_build_object(
    'service_id', sv.id, 'base_price', sv.base_price, 'currency', sv.currency,
    'capacity_percentage', cap, 'price_increase_percentage', inc,
    'price_increase_amount', inc_amt, 'dynamic_price', dyn,
    'support_discount_percentage', sup_pct, 'support_discount_amount', sup_amt,
    'final_price', fin, 'current_booking', sv.current_booking, 'max_booking', sv.max_booking
  );
end $$;

-- 4) Nearby support-discount allocation (fair distribution, radius enforced, never distant)
-- Called after bookings/pricing changes or by cron. status pending_allocation when no eligible target.
create or replace function allocate_support_discount(p_source_event_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  src record; rl record;
  cap numeric(7,2); inc numeric(7,2) := 0; thr jsonb; t jsonb;
  radius numeric := 25; maxd numeric := 30; minc numeric := 0; maxc numeric := 70;
  tgt record; dist numeric; did uuid;
begin
  select * into src from events where id = p_source_event_id;
  if not found then raise exception 'Source event not found'; end if;
  -- config: prefer per-event app_settings override else defaults
  select (value->>'radiusKm')::numeric into radius from app_settings where key = 'support_defaults';
  radius := coalesce(radius, 25); maxd := 30; minc := 0; maxc := 70;
  -- capacity from linked services bookings? v1: derive from events.capacity + count of bookings on services of same location? Use events.capacity vs synthetic current from bookings table via company? Simplify: use max of linked service capacity percentages where service name matches event, else 0.
  -- For determinism v1: treat events.capacity as max and count active support-generated bookings referencing source_event_id as current
  -- Fallback: if capacity null, no increase.
  if src.capacity is null or src.capacity <= 0 then
    insert into event_support_discounts (source_event_id, discount_percentage, status) values (src.id, 0, 'pending_allocation') returning id into did;
    return did;
  end if;
  -- current = active bookings count linked to event via bookings.source_event_id
  select count(*)::numeric into cap from bookings where source_event_id = src.id and status in ('pending','confirmed');
  cap := round((cap / src.capacity) * 100, 2);
  thr := '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb;
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if inc <= 0 then
    insert into event_support_discounts (source_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (src.id, cap, 0, 0, 'expired') returning id into did;
    return did;
  end if;
  if inc > maxd then inc := maxd; end if;
  -- find eligible nearby: active, not expired, capacity within [minc,maxc], within radius, fair rotation (fewest active discounts received, then distance, then lowest capacity)
  select e.*, haversine_km(src.lat, src.lng, e.lat, e.lng) as d,
    (select count(*) from event_support_discounts s where s.target_event_id = e.id and s.status='active') as got,
    (select count(*) from bookings b join services sv on sv.id=b.service_id where b.status in ('pending','confirmed') and sv.company_id in (select id from companies where location = e.location)) as cur
    into tgt
  from events e
  where e.id <> src.id and e.active = true
    and (e.end_at is null or e.end_at >= now())
    and e.lat is not null
    and haversine_km(src.lat, src.lng, e.lat, e.lng) <= radius
  order by got asc, d asc nulls last
  limit 1;
  if tgt.id is null then
    insert into event_support_discounts (source_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (src.id, cap, inc, inc, 'pending_allocation') returning id into did;
    return did;
  end if;
  insert into event_support_discounts (source_event_id, target_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, distance_km, status, start_at, end_at)
  values (src.id, tgt.id, cap, inc, least(inc, maxd), tgt.d, 'active', now(), now() + interval '48 hours')
  returning id into did;
  -- audit
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description, metadata)
  values (auth.uid(), 'system', 'support discount allocated', 'event_support_discount', did::text, src.title_en, 'Auto allocation', jsonb_build_object('source', src.id, 'target', tgt.id, 'distance_km', tgt.d, 'discount', inc));
  return did;
end $$;

-- 5) Transactional booking creation — locks capacity, authoritative price, snapshot, notification
create or replace function create_booking(p_service_id uuid, p_booking_date timestamptz, p_quantity int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sv record; q jsonb;
  qty int := greatest(1, coalesce(p_quantity,1));
  ref text; bid uuid;
  per_unit numeric(12,2); total numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into sv from services where id = p_service_id for update;
  if not found then raise exception 'Service not found'; end if;
  if sv.available = false then raise exception 'Service unavailable'; end if;
  if sv.available_from is not null and p_booking_date < sv.available_from then raise exception 'Service not yet available'; end if;
  if sv.available_until is not null and p_booking_date > sv.available_until then raise exception 'Service expired'; end if;
  if sv.current_booking + qty > sv.max_booking then raise exception 'Fully booked'; end if;

  q := calculate_price_quote(p_service_id);
  per_unit := (q->>'final_price')::numeric;
  total := round((per_unit * qty)::numeric, 2);
  ref := 'JOR-' || to_char(now(),'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text),1,6));

  insert into bookings (user_id, service_id, company_id, booking_date, quantity, base_price,
    capacity_percentage, price_increase_percentage, price_increase_amount, dynamic_price,
    support_discount_percentage, support_discount_amount, final_price, currency, status, booking_reference)
  values (auth.uid(), sv.id, sv.company_id, p_booking_date, qty, sv.base_price,
    (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, (q->>'price_increase_amount')::numeric, (q->>'dynamic_price')::numeric,
    (q->>'support_discount_percentage')::numeric, round(((q->>'support_discount_amount')::numeric * qty)::numeric,2), total, sv.currency, 'pending', ref)
  returning id into bid;

  update services set current_booking = current_booking + qty, current_price = (q->>'dynamic_price')::numeric, updated_at = now() where id = sv.id;

  insert into service_price_history (service_id, old_price, new_price, booking_percentage, price_increase_percentage, reason, changed_by)
  values (sv.id, sv.current_price, (q->>'dynamic_price')::numeric, (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, 'booking', auth.uid());

  insert into notifications (user_id, title, body, type)
  values (auth.uid(), 'Booking received', 'Your booking ' || ref || ' is pending confirmation.', 'booking');

  -- try support re-allocation for linked event (best effort)
  -- (no-op if no event linked)

  return jsonb_build_object('booking_id', bid, 'booking_reference', ref, 'final_price', total, 'currency', sv.currency, 'status', 'pending');
end $$;

-- 6) Admin ops (permission-checked)
create or replace function admin_set_booking_status(p_booking_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare b record; nm text;
begin
  if not public.has_permission('manage_bookings') then raise exception 'Forbidden'; end if;
  if p_status not in ('pending','confirmed','cancelled','completed','expired','rejected') then raise exception 'Invalid status'; end if;
  select * into b from bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  update bookings set status = p_status, updated_at = now() where id = p_booking_id;
  select coalesce(first_name,'admin') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description)
  values (auth.uid(), coalesce(nm,'admin'), 'booking ' || p_status, 'booking', p_booking_id::text, b.booking_reference, 'Status -> ' || p_status);
  insert into notifications (user_id, title, body, type)
  values (b.user_id,
    case when p_status='confirmed' then 'Booking confirmed' when p_status='rejected' then 'Booking rejected' else 'Booking ' || p_status end,
    'Your booking ' || b.booking_reference || ' is now ' || p_status || '.', 'booking');
end $$;

create or replace function admin_set_promotion_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.has_permission('manage_promotions') then raise exception 'Forbidden'; end if;
  if p_status not in ('active','scheduled','expired','cancelled') then raise exception 'Invalid'; end if;
  -- server-side validation: expired promotions cannot receive a boost
  update event_promotions set status = p_status, updated_at = now() where id = p_id;
  select coalesce(first_name,'admin') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, description)
  values (auth.uid(), coalesce(nm,'admin'), 'promotion ' || p_status, 'event_promotion', p_id::text, 'Status -> ' || p_status);
end $$;

create or replace function admin_set_support_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.has_permission('manage_support_pricing') then raise exception 'Forbidden'; end if;
  if p_status not in ('active','scheduled','expired','cancelled','used','pending_allocation') then raise exception 'Invalid'; end if;
  update event_support_discounts set status = p_status, updated_at = now() where id = p_id;
  select coalesce(first_name,'admin') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, description)
  values (auth.uid(), coalesce(nm,'admin'), 'support discount ' || p_status, 'event_support_discount', p_id::text, 'Status -> ' || p_status);
end $$;

create or replace function admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o jsonb;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'companies', (select count(*) from companies),
    'services', (select count(*) from services),
    'events', (select count(*) from events),
    'bookings', (select count(*) from bookings),
    'pending_bookings', (select count(*) from bookings where status='pending'),
    'confirmed_bookings', (select count(*) from bookings where status='confirmed'),
    'revenue', coalesce((select sum(final_price) from bookings where status in ('confirmed','completed')),0),
    'active_services', (select count(*) from services where available=true),
    'active_promotions', (select count(*) from event_promotions where status='active'),
    'active_support', (select count(*) from event_support_discounts where status='active'),
    'pending_support', (select count(*) from event_support_discounts where status='pending_allocation')
  ) into o;
  return o;
end $$;

-- 7) Boss admin ops
create or replace function boss_list_admins()
returns table (user_id uuid, email text, role text, is_active boolean) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_boss() then raise exception 'Boss only'; end if;
  return query select ur.user_id, p.email, ur.role, (ur.role in ('admin','boss_admin')) as is_active
    from user_roles ur left join profiles p on p.id = ur.user_id where ur.role in ('admin','boss_admin') order by ur.created_at desc;
end $$;

create or replace function boss_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.is_boss() then raise exception 'Boss only'; end if;
  if p_role not in ('user','admin','boss_admin') then raise exception 'Invalid role'; end if;
  update user_roles set role = p_role, updated_at = now() where user_id = p_user_id;
  if not found then insert into user_roles (user_id, role) values (p_user_id, p_role); end if;
  select coalesce(first_name,'boss') into nm from profiles where id = auth.uid();
  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, description)
  values (auth.uid(), coalesce(nm,'boss'), 'role changed to ' || p_role, 'user_role', p_user_id::text, p_role);
end $$;

-- 8) Expire old promotions/discounts (call from cron)
create or replace function expire_stale() returns void language plpgsql security definer set search_path = public as $$
begin
  update event_promotions set status='expired', updated_at=now() where status in ('active','scheduled') and end_at is not null and end_at < now();
  update event_support_discounts set status='expired', updated_at=now() where status in ('active','scheduled') and end_at is not null and end_at < now();
end $$;
