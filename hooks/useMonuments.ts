import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/** categoryId accepts one id or several (duplicate-named categories are merged by callers). */
export function useMonuments(categoryId?: string | string[]) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = Array.isArray(categoryId) ? [...categoryId].sort().join(',') : (categoryId ?? '');
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let q = supabase.from('monuments').select('*, categories(name_en,name_ar)').eq('active', true).order('name_en').limit(100);
      const ids = Array.isArray(categoryId) ? categoryId : categoryId ? [categoryId] : [];
      if (ids.length > 0) q = q.in('category_id', ids);
      const { data, error } = await q;
      if (error) throw error;
      // Defense in depth: never render two same-named places (first wins).
      const seen = new Set<string>();
      setRows((data ?? []).filter((m: any) => {
        const n = String(m.name_en ?? '').trim().toLowerCase();
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      }));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [key]);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
}

export function useCategories() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('categories').select('*').order('name_en');
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);
  return { rows, loading };
}
