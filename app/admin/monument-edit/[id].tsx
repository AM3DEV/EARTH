import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { MonumentForm } from '../../../components/admin/MonumentForm';
import { LoadingState } from '../../../components/ui/States';

export default function MonumentEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('monuments').select('*').eq('id', id).maybeSingle();
      setRow(data);
    })();
  }, [id]);
  if (!row) return <LoadingState />;
  return <MonumentForm initial={row} monumentId={id} />;
}
