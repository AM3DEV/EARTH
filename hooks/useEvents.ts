import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useEvents(categoryId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Discovery ranking: promoted first (via view), then date. Server view event_discovery.
      const { data, error } = await supabase.from('event_discovery').select('*').limit(100);
      if (error) throw error;
      let r = (data ?? []).filter((e: any) => e.active !== false);
      if (categoryId) r = r.filter((e: any) => e.category_id === categoryId);
      setRows(r);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [categoryId]);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
}

export function useServices(companyId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from('services').select('*').eq('available', true).limit(100);
      if (companyId) q = q.eq('company_id', companyId);
      const { data } = await q;
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [companyId]);
  return { rows, loading };
}
