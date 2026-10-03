-- 0019_promo_batches.sql — percent picker support + auto-minted EARTH promo codes.
-- Run once in Supabase SQL Editor.
-- 1) Promo code format becomes EARTH-XXXX-XXX-XXX everywhere (incl. store buys).
-- 2) mint_store_codes(item, count): admins mint a batch of codes for an item
--    (e.g. 10 codes of 20% off) to distribute offline — owned by the minter.

-- Shared generator: EARTH-XXXX-XXX-XXX (uppercase hex groups).
create or replace function make_promo_code()
returns text language sql volatile set search_path = public as $$
  select 'EARTH-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 3)) || '-'
    || upper(substr(md5(gen_random_uuid()::text), 1, 3));
$$;

-- buy_store_item with EARTH codes (same logic as 0015, new format).
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
  v_code := make_promo_code();

  insert into coupons (code, user_id, store_item_id, kind, value, status)
  values (v_code, v_user, v_item.id, v_item.kind, v_item.value, 'active');
  insert into loyalty_ledger (user_id, company_id, points, kind, note)
  values (v_user, null, -v_item.points_cost, 'redeem', 'Store: ' || v_item.title_en);

  select points into v_bal from loyalty_wallets where user_id = v_user;
  return jsonb_build_object('code', v_code, 'balance', v_bal);
end $$;

-- Mint N codes of an item for the admin (to print/share offline).
create or replace function mint_store_codes(p_item_id uuid, p_count int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item record;
  n int := least(greatest(coalesce(p_count, 10), 1), 100);
  codes text[] := '{}';
  c text;
  tries int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_item from store_items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.active = false then raise exception 'Activate the item first'; end if;

  for i in 1..n loop
    tries := 0;
    loop
      c := make_promo_code();
      begin
        insert into coupons (code, user_id, store_item_id, kind, value, status)
        values (c, auth.uid(), v_item.id, v_item.kind, v_item.value, 'active');
        exit;
      exception when unique_violation then
        tries := tries + 1;
        if tries > 5 then raise exception 'Code collision, please retry'; end if;
      end;
    end loop;
    codes := codes || c;
  end loop;

  return jsonb_build_object('codes', to_jsonb(codes), 'count', n);
end $$;
