-- 0013_loyalty_qr.sql — affiliate QR loyalty: scan in store → earn points → redeem as booking discount.
-- Run once in Supabase SQL Editor.
-- Flow: each company gets a unique qr_token (QR printed for the store).
-- Logged-in tourists scan it in the app (/scan) → loyalty_scan awards points
-- (once per company per cooldown). Points redeem at booking via create_booking.

-- ── 1) Company QR identity + per-scan award ──
alter table companies add column if not exists qr_token text;
alter table companies add column if not exists qr_points int not null default 10;

update companies set qr_token = replace(gen_random_uuid()::text, '-', '') where qr_token is null;
alter table companies alter column qr_token set default replace(gen_random_uuid()::text, '-', '');
alter table companies alter column qr_token set not null;
create unique index if not exists companies_qr_token_uidx on companies (qr_token);

-- ── 2) Wallets + ledger (writes go through RPCs only) ──
create table if not exists loyalty_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points int not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  points int not null,
  kind text not null check (kind in ('earn', 'redeem')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ledger_user on loyalty_ledger (user_id, created_at desc);

-- Booking receipt of redemption
alter table bookings add column if not exists points_redeemed int not null default 0;
alter table bookings add column if not exists loyalty_discount_amount numeric(12,2) not null default 0;

-- ── 3) Tunables (change anytime via app_settings) ──
insert into app_settings (key, value) values
  ('loyalty_points_per_scan', '10'),
  ('loyalty_cooldown_hours', '24'),
  ('loyalty_currency_per_point', '0.05'),
  ('loyalty_min_redeem', '50')
on conflict (key) do nothing;

-- ── 4) RLS: tourists read own wallet/ledger; only RPCs write ──
alter table loyalty_wallets enable row level security;
alter table loyalty_ledger enable row level security;
drop policy if exists "own wallet" on loyalty_wallets;
create policy "own wallet" on loyalty_wallets for select using (auth.uid() = user_id);
drop policy if exists "own ledger" on loyalty_ledger;
create policy "own ledger" on loyalty_ledger for select using (auth.uid() = user_id);
drop policy if exists "admin all loyalty" on loyalty_wallets;
create policy "admin all loyalty" on loyalty_wallets for select using (public.is_admin());
drop policy if exists "admin all ledger" on loyalty_ledger;
create policy "admin all ledger" on loyalty_ledger for select using (public.is_admin());

-- ── 5) Scan: award points with per-company cooldown ──
create or replace function loyalty_scan(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_comp record;
  v_cooldown int := coalesce((select value::int from app_settings where key = 'loyalty_cooldown_hours'), 24);
  v_award int;
  v_balance int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_comp from companies where qr_token = nullif(trim(coalesce(p_token, '')), '') and active = true;
  if not found then raise exception 'Unknown or inactive QR code'; end if;

  if exists (
    select 1 from loyalty_ledger
    where user_id = v_user and company_id = v_comp.id and kind = 'earn'
      and created_at > now() - make_interval(hours => v_cooldown)
  ) then
    raise exception 'Already scanned here recently — come back later for more points';
  end if;

  v_award := greatest(1, coalesce(v_comp.qr_points, coalesce((select value::int from app_settings where key = 'loyalty_points_per_scan'), 10)));

  insert into loyalty_wallets (user_id, points, updated_at)
  values (v_user, v_award, now())
  on conflict (user_id) do update set points = loyalty_wallets.points + v_award, updated_at = now();

  insert into loyalty_ledger (user_id, company_id, points, kind, note)
  values (v_user, v_comp.id, v_award, 'earn', 'QR scan');

  select points into v_balance from loyalty_wallets where user_id = v_user;
  return jsonb_build_object('awarded', v_award, 'balance', v_balance, 'company_name', v_comp.name_en);
end $$;

-- ── 6) create_booking + optional points redemption (backward compatible) ──
create or replace function create_booking(p_service_id uuid, p_booking_date timestamptz, p_quantity int, p_redeem_points int default 0)
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

  insert into bookings (user_id, service_id, company_id, booking_date, quantity, base_price,
    capacity_percentage, price_increase_percentage, price_increase_amount, dynamic_price,
    support_discount_percentage, support_discount_amount, final_price, currency, status, booking_reference,
    points_redeemed, loyalty_discount_amount)
  values (auth.uid(), sv.id, sv.company_id, p_booking_date, qty, sv.base_price,
    (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, (q->>'price_increase_amount')::numeric, (q->>'dynamic_price')::numeric,
    (q->>'support_discount_percentage')::numeric, round(((q->>'support_discount_amount')::numeric * qty)::numeric,2), total, sv.currency, 'pending', ref,
    v_used, v_disc)
  returning id into bid;

  update services set current_booking = current_booking + qty, current_price = (q->>'dynamic_price')::numeric, updated_at = now() where id = sv.id;

  insert into service_price_history (service_id, old_price, new_price, booking_percentage, price_increase_percentage, reason, changed_by)
  values (sv.id, sv.current_price, (q->>'dynamic_price')::numeric, (q->>'capacity_percentage')::numeric, (q->>'price_increase_percentage')::numeric, 'booking', auth.uid());

  insert into notifications (user_id, title, body, type)
  values (auth.uid(), 'Booking received', 'Your booking ' || ref || ' is pending confirmation.', 'booking');

  -- try support re-allocation for linked event (best effort)
  -- (no-op if no event linked)

  return jsonb_build_object('booking_id', bid, 'booking_reference', ref, 'final_price', total, 'currency', sv.currency, 'status', 'pending', 'points_redeemed', v_used, 'loyalty_discount', v_disc);
end $$;
