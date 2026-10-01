import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMonuments(categoryId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let q = supabase.from('monuments').select('*, categories(name_en,name_ar)').order('name_en').limit(100);
      if (categoryId) q = q.eq('category_id', categoryId);
      const { data, error } = await q;
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [categoryId]);
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
