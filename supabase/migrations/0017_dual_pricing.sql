-- 0017_dual_pricing.sql — tourist price + Jordan-citizen price per service.
-- Run once in Supabase SQL Editor.
-- Rule: when the caller is a citizen (profiles.user_kind) AND the service has
-- a citizen_price set, the whole quote engine (increases, discounts, booking
-- receipt) runs on the citizen base instead of the tourist base.

alter table services add column if not exists citizen_price numeric(12,2)
  check (citizen_price is null or citizen_price >= 0);

-- Kind-aware quote: same math, different base depending on who asks.
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
  thr := coalesce(rl.booking_thresholds, '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb);
  for t in select * from jsonb_array_elements(thr) loop
    if cap >= (t->>'min')::numeric and cap <= (t->>'max')::numeric then inc := (t->>'increase')::numeric; exit; end if;
  end loop;
  if rl.enabled = false then inc := 0; end if;
  if inc > coalesce(sv.max_price_increase_percentage, inc) then inc := sv.max_price_increase_percentage; end if;
  if rl.max_increase_percentage is not null and inc > rl.max_increase_percentage then inc := rl.max_increase_percentage; end if;
  inc_amt := round((v_base * inc / 100)::numeric, 2);
  dyn := round((v_base + inc_amt)::numeric, 2);
  -- best active support discount targeting this service's linked event OR service itself via event_support_discounts joined through services? v1: support discounts attach to events;
  -- for services we look up active discounts where target matches a linked heuristic: none — return global best active discount for services flagged via description? Keep: check support mapped by service id stored in event_support_discounts.target_event_id only for events.
  -- For service detail we surface active discount if the service itself has discount_enabled/current_discount_percentage maintained by allocate job.
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

-- Receipt fix: snapshot the APPLIED base (citizen or tourist), not always the tourist one.
-- (Same body as 0015's create_booking + loyalty/coupon logic — only base_price source changes.)
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

  -- Loyalty redemption: points → discount in booking currency, capped at total.
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

  insert into service_price_history (service_id, old_price, new_price, booking_percentage, price_increase_percentage, reason, changed_by)
  values (sv.id, sv.current_price, (q->>'dynamic_price')::numeric, (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, 'booking', auth.uid());

  insert into notifications (user_id, title, body, type)
  values (auth.uid(), 'Booking received', 'Your booking ' || ref || ' is pending confirmation.', 'booking');

  -- try support re-allocation for linked event (best effort)
  -- (no-op if no event linked)

  return jsonb_build_object('booking_id', bid, 'booking_reference', ref, 'final_price', total, 'currency', sv.currency, 'status', 'pending', 'points_redeemed', v_used, 'loyalty_discount', v_disc, 'coupon_discount', v_cdisc);
end $$;
