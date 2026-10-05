-- 0026_fix_increase_bands.sql - make demand-based price increases actually trigger.
-- Run once in Supabase SQL Editor.
-- BUG: capacity is a PERCENTAGE (0-100) but the old bands were
--   0-100 -> 0%, 101-106 -> 3%, ... (101%+ is unreachable: bookings cap at max),
--   so the increase was ALWAYS 0% and prices never rose with demand.
-- FIX: percentage bands that trigger as the service fills up:
--   0-49% -> +0%, 50-69% -> +5%, 70-84% -> +10%, 85-94% -> +15%, 95%+ -> +20%
-- (still capped by services.max_price_increase_percentage, default 20).

-- 1. Fix the column default for future pricing_rules rows.
alter table pricing_rules alter column booking_thresholds set default
  '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":94,"increase":15},{"min":95,"max":9999,"increase":20}]'::jsonb;

-- 2. Migrate rows that still carry the old broken default (custom rows untouched).
update pricing_rules set booking_thresholds =
  '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":94,"increase":15},{"min":95,"max":9999,"increase":20}]'::jsonb
where booking_thresholds = '[{"min":0,"max":100,"increase":0},{"min":101,"max":106,"increase":3},{"min":107,"max":110,"increase":10},{"min":111,"max":115,"increase":15},{"min":116,"max":9999,"increase":20}]'::jsonb;

-- 3. Same fixed fallback inside the quote engine (services with no rule row).
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
  thr := coalesce(rl.booking_thresholds, '[{"min":0,"max":49,"increase":0},{"min":50,"max":69,"increase":5},{"min":70,"max":84,"increase":10},{"min":85,"max":94,"increase":15},{"min":95,"max":9999,"increase":20}]'::jsonb);
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
