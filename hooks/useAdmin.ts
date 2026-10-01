import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc('admin_dashboard_stats');
        setStats(data);
      } catch { setStats(null); } finally { setLoading(false); }
    })();
  }, []);
  return { stats, loading };
}
