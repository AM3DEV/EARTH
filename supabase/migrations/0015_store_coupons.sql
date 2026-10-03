-- 0015_store_coupons.sql — points store: exchange points for discount coupons, use at booking.
-- Run once in Supabase SQL Editor.
-- Flow: admin creates store_items (e.g. "10% off" for 200 pts). Tourists buy
-- with points → get a JDC-XXXXXX code → enter it on the booking page → discount.

-- ── 1) Catalog + issued coupons ──
create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_ar text not null,
  description_en text,
  description_ar text,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12,2) not null default 0 check (value >= 0),
  points_cost int not null default 100 check (points_cost >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  store_item_id uuid references store_items(id) on delete set null,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists idx_coupons_user on coupons (user_id, created_at desc);
create index if not exists idx_coupons_code on coupons (code);

-- Booking receipt of coupon redemption
alter table bookings add column if not exists coupon_id uuid references coupons(id) on delete set null;
alter table bookings add column if not exists coupon_discount_amount numeric(12,2) not null default 0;

-- ── 2) RLS ──
alter table store_items enable row level security;
alter table coupons enable row level security;
drop policy if exists "public read store" on store_items;
create policy "public read store" on store_items for select using (active = true);
drop policy if exists "admin all store" on store_items;
create policy "admin all store" on store_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "own coupons" on coupons;
create policy "own coupons" on coupons for select using (auth.uid() = user_id);
drop policy if exists "admin all coupons" on coupons;
create policy "admin all coupons" on coupons for select using (public.is_admin());

-- ── 3) Buy a coupon with points ──
create or replace function buy_store_item(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item record;
  v_bal int := 0;
  v_code text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_item from store_items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.active = false then raise exception 'Item unavailable'; end if;

  select points into v_bal from loyalty_wallets where user_id = v_user for update;
  if coalesce(v_bal, 0) < v_item.points_cost then raise exception 'Not enough points'; end if;

  update loyalty_wallets set points = points - v_item.points_cost, updated_at = now() where user_id = v_user;
  v_code := 'JDC-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into coupons (code, user_id, store_item_id, kind, value, status)
  values (v_code, v_user, v_item.id, v_item.kind, v_item.value, 'active');
  insert into loyalty_ledger (user_id, company_id, points, kind, note)
  values (v_user, null, -v_item.points_cost, 'redeem', 'Store: ' || v_item.title_en);

  select points into v_bal from loyalty_wallets where user_id = v_user;
  return jsonb_build_object('code', v_code, 'balance', v_bal);
end $$;

-- ── 4) create_booking + coupon redemption (backward compatible) ──
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
  values (auth.uid(), sv.id, sv.company_id, p_booking_date, qty, sv.base_price,
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
