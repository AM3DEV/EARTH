import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useBookings() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRows([]); return; }
      const { data, error } = await supabase.from('bookings')
        .select('*, services(name_en,name_ar,base_price,currency), companies(name_en,name_ar)')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
}

export async function createBookingServer(input: { service_id: string; booking_date: string; quantity: number; redeemPoints?: number; couponCode?: string }) {
  // Authoritative transactional RPC — never trust client price.
  const { data, error } = await supabase.rpc('create_booking', {
    p_service_id: input.service_id,
    p_booking_date: input.booking_date,
    p_quantity: input.quantity,
    p_redeem_points: input.redeemPoints ?? 0,
    p_coupon_code: input.couponCode?.trim() || null,
  });
  if (error) throw error;
  return data;
}

/** Signed-in tourist's loyalty wallet (points). Null when logged out. */
export async function getWallet(): Promise<{ points: number } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('loyalty_wallets').select('points').eq('user_id', user.id).maybeSingle();
  return { points: data?.points ?? 0 };
}

/** Buy a store coupon with loyalty points → returns the JDC code. */
export async function buyStoreItem(itemId: string) {
  const { data, error } = await supabase.rpc('buy_store_item', { p_item_id: itemId });
  if (error) throw error;
  return data as { code: string; balance: number };
}
/** Scan a company QR (payload `JG1:<token>`) → earn points. */
export async function scanCompanyQr(payload: string) {
  const token = String(payload ?? '').trim().replace(/^JG1:/, '');
  if (!token) throw new Error('Invalid QR code');
  const { data, error } = await supabase.rpc('loyalty_scan', { p_token: token });
  if (error) throw error;
  return data as { awarded: number; balance: number; company_name: string };
}
