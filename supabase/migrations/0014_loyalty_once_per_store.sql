-- 0014_loyalty_once_per_store.sql — each store QR awards points only ONCE per tourist.
-- Run once in Supabase SQL Editor. (Replaces the 24h cooldown with a lifetime rule
-- to prevent scan farming. To go back to daily, restore the created_at window check.)
create or replace function loyalty_scan(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_comp record;
  v_award int;
  v_balance int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select * into v_comp from companies where qr_token = nullif(trim(coalesce(p_token, '')), '') and active = true;
  if not found then raise exception 'Unknown or inactive QR code'; end if;

  if exists (
    select 1 from loyalty_ledger
    where user_id = v_user and company_id = v_comp.id and kind = 'earn'
  ) then
    raise exception 'This QR was already scanned — each store QR can be used once';
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
