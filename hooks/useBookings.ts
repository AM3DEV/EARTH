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

export async function createBookingServer(input: { service_id: string; booking_date: string; quantity: number }) {
  // Authoritative transactional RPC — never trust client price.
  const { data, error } = await supabase.rpc('create_booking', {
    p_service_id: input.service_id,
    p_booking_date: input.booking_date,
    p_quantity: input.quantity,
  });
  if (error) throw error;
  return data;
}
