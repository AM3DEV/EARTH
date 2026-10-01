import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { ServiceForm } from '../../../components/admin/ServiceForm';
import { LoadingState } from '../../../components/ui/States';

export default function ServiceEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('services').select('*').eq('id', id).maybeSingle();
      setRow(data);
    })();
  }, [id]);
  if (!row) return <LoadingState />;
  return <ServiceForm initial={row} serviceId={id} />;
}
