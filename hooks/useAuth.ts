import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'user' | 'admin' | 'boss_admin'>('user');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user ?? null);
    if (data.session?.user) {
      const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', data.session.user.id).maybeSingle();
      setRole(((r?.role as any) ?? 'user'));
    } else setRole('user');
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { user, role, loading, refresh, isAdmin: role === 'admin' || role === 'boss_admin', isBoss: role === 'boss_admin' };
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProfile(null); return; }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      setProfile(data as Profile);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { profile, loading, error, reload: load };
}
