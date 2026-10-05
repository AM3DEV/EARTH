-- 0027_overbooking.sql - book past 100% with rising prices, fund near-event discounts.
-- Run once in Supabase SQL Editor.
--
-- RULES (locked with the client):
--  1. No booking limit: clients can always book while the service is active.
--  2. Price past 100%: 100-109% full -> +15% (100 -> 115), 110%+ -> +20% (max).
--     Full bands: 0-49 +0% | 50-69 +5% | 70-84 +10% | 85-109 +15% | 110%+ +20%.
--  3. Every booking at/above 100% capacity auto-funds the nearest active event
--     (within 25 km) with a 48h discount EQUAL to the increase %.

-- 1. New bands everywhere.
alter table pricing_rules alter column booking_thresholds set default
  '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb;

update pricing_rules set booking_thresholds =
  '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb
where booking_thresholds = '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":94,"increase":15},{"min":95,"max":9999,"increase":20}]'::jsonb;

-- 2. Service-sourced support rows: source event optional, source service tracked.
alter table event_support_discounts add column if not exists source_service_id uuid references services(id) on delete cascade;
alter table event_support_discounts alter column source_event_id drop not null;
create index if not exists idx_support_source_service on event_support_discounts(source_service_id);

-- 3. Quote engine with the new bands fallback.
create or replace function calculate_price_quote(p_service_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  sv record; rl record;
  cap numeric(7,2) := 0; inc numeric(7,2) := 0;
  thr jsonb; t jsonb;
  inc_amt numeric(12,2) := 0; dyn numeric(12,2) := 0;
  sup_pct numeric(7,2) := 0; sup_amt numeric(12,2) := 0; fin numeric(12,2) := 0;
  sup record;
  v_kind text;
  v_base numeric(12,2);
  v_citizen boolean := false;
begin
  select * into sv from services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;
  select user_kind into v_kind from profiles where id = auth.uid();
  if v_kind = 'citizen' and sv.citizen_price is not null then
    v_base := sv.citizen_price;
    v_citizen := true;
  else
    v_base := sv.base_price;
  end if;
  select * into rl from pricing_rules where service_id = p_service_id;
  if sv.max_booking > 0 then cap := round((sv.current_booking::numeric / sv.max_booking::numeric) * 100, 2); else cap := 0; end if;
  thr := coalesce(rl.booking_thresholds, '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb);
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if rl.enabled = false then inc := 0; end if;
  if inc > coalesce(sv.max_price_increase_percentage, inc) then inc := sv.max_price_increase_percentage; end if;
  if rl.max_increase_percentage is not null and inc > rl.max_increase_percentage then inc := rl.max_increase_percentage; end if;
  inc_amt := round((v_base * inc / 100)::numeric, 2);
  dyn := round((v_base + inc_amt)::numeric, 2);
  if sv.discount_enabled then sup_pct := least(coalesce(sv.current_discount_percentage,0), coalesce(rl.maximum_support_discount_percentage,30)); end if;
  sup_amt := round((dyn * sup_pct / 100)::numeric, 2);
  fin := greatest(round((dyn - sup_amt)::numeric,2), 0);
  return jsonb_build_object(
    'service_id', sv.id, 'base_price', v_base, 'currency', sv.currency,
    'is_citizen_price', v_citizen,
    'capacity_percentage', cap, 'price_increase_percentage', inc,
    'price_increase_amount', inc_amt, 'dynamic_price', dyn,
    'support_discount_percentage', sup_pct, 'support_discount_amount', sup_amt,
    'final_price', fin, 'current_booking', sv.current_booking, 'max_booking', sv.max_booking
  );
end $$;

-- 4. Overbooking support: nearest active event within 25 km gets discount = increase %.
-- One live row per service, refreshed as the increase grows (48h window each time).
create or replace function allocate_support_from_service(p_service_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  sv record; clat double precision; clng double precision;
  cap numeric(7,2) := 0; inc numeric(7,2) := 0;
  thr jsonb := '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":109,"increase":15},{"min":110,"max":99999,"increase":20}]'::jsonb;
  t jsonb; tgt record; did uuid; radius numeric := 25;
begin
  select * into sv from services where id = p_service_id;
  if not found then return null; end if;
  select lat, lng into clat, clng from companies where id = sv.company_id;
  if clat is null or clng is null then return null; end if;
  if coalesce(sv.max_booking, 0) > 0 then
    cap := round((sv.current_booking::numeric / sv.max_booking::numeric) * 100, 2);
  end if;
  if cap < 100 then return null; end if;
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if inc <= 0 then return null; end if;

  select e.*,
    (select count(*) from event_support_discounts s where s.target_event_id = e.id and s.status = 'active') as got,
    haversine_km(clat, clng, e.lat, e.lng) as d
    into tgt
  from events e
  where e.active = true
    and (e.end_at is null or e.end_at >= now())
    and e.lat is not null
    and haversine_km(clat, clng, e.lat, e.lng) <= radius
  order by got asc, d asc nulls last
  limit 1;
  if tgt.id is null then
    insert into event_support_discounts (source_service_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, status)
    values (sv.id, cap, inc, inc, 'pending_allocation') returning id into did;
    return did;
  end if;

  select id into did from event_support_discounts
  where source_service_id = sv.id and status = 'active' order by created_at desc limit 1;
  if did is not null then
    update event_support_discounts set
      target_event_id = tgt.id,
      source_capacity_percentage = cap,
      source_price_increase_percentage = inc,
      discount_percentage = inc,
      distance_km = tgt.d,
      start_at = now(), end_at = now() + interval '48 hours', updated_at = now()
    where id = did;
  else
    insert into event_support_discounts (source_service_id, target_event_id, source_capacity_percentage, source_price_increase_percentage, discount_percentage, distance_km, status, start_at, end_at)
    values (sv.id, tgt.id, cap, inc, inc, tgt.d, 'active', now(), now() + interval '48 hours')
    returning id into did;
  end if;

  insert into admin_activity_logs (admin_user_id, admin_name_snapshot, action, entity_type, entity_id, entity_name, description, metadata)
  values (auth.uid(), 'system', 'overbooking support allocated', 'event_support_discount', did::text, sv.name_en, 'Auto allocation', jsonb_build_object('service', sv.id, 'target', tgt.id, 'distance_km', tgt.d, 'discount', inc));
  return did;
end $$;

-- 5. Booking without the Fully-booked block + overbooking support trigger.
create or replace function create_booking(p_service_id uuid, p_booking_date timestamptz, p_quantity int, p_redeem_points int default 0, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sv record; q jsonb;
  qty int := greatest(1, coalesce(p_quantity,1));
  ref text; bid uuid;
  per_unit numeric(12,2); total numeric(12,2);
  v_rate numeric := coalesce((select value::numeric from app_settings where key = 'loyalty_currency_per_point'), 0.05);
  v_min int := coalesce((select value::int from app_settings where key = 'loyalty_min_redeem'), 50);
  v_req int := greatest(0, coalesce(p_redeem_points, 0));
  v_bal int := 0;
  v_used int := 0;
  v_disc numeric(12,2) := 0;
  v_code text := nullif(trim(coalesce(p_coupon_code, '')), '');
  v_cpn record;
  v_cpn_id uuid := null;
  v_cdisc numeric(12,2) := 0;
  v_cap numeric(7,2) := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into sv from services where id = p_service_id for update;
  if not found then raise exception 'Service not found'; end if;
  if sv.available = false then raise exception 'Service unavailable'; end if;
  if sv.available_from is not null and p_booking_date < sv.available_from then raise exception 'Service not yet available'; end if;
  if sv.available_until is not null and p_booking_date > sv.available_until then raise exception 'Service expired'; end if;
  -- NO capacity block: overbooking is allowed while the service is active.

  q := calculate_price_quote(p_service_id);
  per_unit := (q->>'final_price')::numeric;
  total := round((per_unit * qty)::numeric, 2);
  ref := 'JOR-' || to_char(now(),'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text),1,6));

  -- Loyalty redemption: points -> discount in booking currency, capped at total.
  if v_req > 0 then
    if v_req < v_min then raise exception 'Minimum % points to redeem', v_min; end if;
    select points into v_bal from loyalty_wallets where user_id = auth.uid() for update;
    if coalesce(v_bal, 0) < v_req then raise exception 'Not enough points'; end if;
    v_disc := least(round((v_req * v_rate)::numeric, 2), total);
    v_used := floor((v_disc / nullif(v_rate, 0))::numeric);
    if v_used <= 0 then raise exception 'Points value too small for this booking'; end if;
    update loyalty_wallets set points = points - v_used, updated_at = now() where user_id = auth.uid();
    insert into loyalty_ledger (user_id, company_id, points, kind, note)
    values (auth.uid(), sv.company_id, -v_used, 'redeem', 'Booking ' || ref);
    total := round((total - v_disc)::numeric, 2);
  end if;

  -- Coupon redemption: percent off, or fixed amount capped at total. Single use.
  if v_code is not null then
    select * into v_cpn from coupons where code = v_code for update;
    if not found then raise exception 'Coupon not found'; end if;
    if v_cpn.user_id != auth.uid() then raise exception 'This coupon belongs to another account'; end if;
    if v_cpn.status != 'active' then raise exception 'Coupon already used'; end if;
    if v_cpn.kind = 'percent' then
      v_cdisc := round((total * least(v_cpn.value, 100) / 100)::numeric, 2);
    else
      v_cdisc := least(v_cpn.value, total);
    end if;
    v_cpn_id := v_cpn.id;
    total := round((total - v_cdisc)::numeric, 2);
  end if;

  insert into bookings (user_id, service_id, company_id, booking_date, quantity, base_price,
    capacity_percentage, price_increase_percentage, price_increase_amount, dynamic_price,
    support_discount_percentage, support_discount_amount, final_price, currency, status, booking_reference,
    points_redeemed, loyalty_discount_amount, coupon_id, coupon_discount_amount)
  values (auth.uid(), sv.id, sv.company_id, p_booking_date, qty, (q->>'base_price')::numeric,
    (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, (q->>'price_increase_amount')::numeric, (q->>'dynamic_price')::numeric,
    (q->>'support_discount_percentage')::numeric, round(((q->>'support_discount_amount')::numeric * qty)::numeric,2), total, sv.currency, 'pending', ref,
    v_used, v_disc, v_cpn_id, v_cdisc)
  returning id into bid;

  if v_cpn_id is not null then
    update coupons set status = 'used', used_at = now(), booking_id = bid where id = v_cpn_id;
  end if;

  update services set current_booking = current_booking + qty, current_price = (q->>'dynamic_price')::numeric, updated_at = now() where id = sv.id;

  -- Overbooking support: at/above 100% capacity, fund the nearest event (best effort).
  begin
    if sv.max_booking > 0 then
      v_cap := round(((sv.current_booking + qty)::numeric / sv.max_booking::numeric) * 100, 2);
    end if;
    if v_cap >= 100 then
      perform allocate_support_from_service(sv.id);
    end if;
  exception when others then null;
  end;

  insert into service_price_history (service_id, old_price, new_price, booking_percentage, price_increase_percentage, reason, changed_by)
  values (sv.id, sv.current_price, (q->>'dynamic_price')::numeric, (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, 'booking', auth.uid());

  insert into notifications (user_id, title, body, type)
  values (auth.uid(), 'Booking received', 'Your booking ' || ref || ' is pending confirmation.', 'booking');

  return jsonb_build_object('booking_id', bid, 'booking_reference', ref, 'final_price', total, 'currency', sv.currency, 'status', 'pending', 'points_redeemed', v_used, 'loyalty_discount', v_disc, 'coupon_discount', v_cdisc);
end $$;
