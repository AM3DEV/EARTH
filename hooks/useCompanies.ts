import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useCompanies(search?: string, categoryId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Server-side search via RPC for scalability (pg_trgm + ranking)
      if (search && search.trim().length > 0) {
        const { data, error } = await supabase.rpc('search_companies', { p_q: search.trim(), p_limit: 30, p_offset: 0 });
        if (error) throw error;
        let filtered = (data ?? []) as any[];
        if (categoryId) filtered = filtered.filter((c) => c.category_id === categoryId);
        setRows(filtered);
      } else {
        let q = supabase.from('companies').select('*, categories(name_en,name_ar)').eq('active', true).order('name_en').limit(50);
        if (categoryId) q = q.eq('category_id', categoryId);
        const { data, error } = await q;
        if (error) throw error;
        setRows(data ?? []);
      }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [search, categoryId]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useCompany(id?: string) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('companies').select('*, categories(name_en,name_ar)').eq('id', id).maybeSingle();
      setRow(data);
      setLoading(false);
    })();
  }, [id]);
  return { row, loading };
}
