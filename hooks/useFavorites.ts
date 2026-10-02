import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useFavorites() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRows([]); setLoading(false); return; }
    const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (target_type: string, target_id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const existing = rows.find((r) => r.target_type === target_type && r.target_id === target_id);
    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, target_type, target_id });
    }
    await load();
  };

  return { rows, loading, reload: load, toggle };
}

export function useReviews(targetType: string, targetId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: false });
    let enriched = data ?? [];
    // Attach public author (photo + name). View may not exist yet → keep plain rows.
    try {
      const ids = [...new Set(enriched.map((r: any) => r.user_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('public_profiles').select('*').in('id', ids);
        const byId: Record<string, any> = {};
        for (const p of profs ?? []) byId[(p as any).id] = p;
        enriched = enriched.map((r: any) => ({ ...r, author: byId[r.user_id] ?? null }));
      }
    } catch {
      // reviews still show without author
    }
    setRows(enriched);
    setLoading(false);
  }, [targetType, targetId]);
  useEffect(() => { load(); }, [load]);

  const add = async (rating: number, comment: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('reviews').insert({ user_id: user.id, target_type: targetType, target_id: targetId, rating, comment });
    if (error) throw error;
    await load();
  };
  return { rows, loading, reload: load, add };
}
