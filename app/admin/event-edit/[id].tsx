import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { EventForm } from '../../../components/admin/EventForm';
import { LoadingState } from '../../../components/ui/States';

export default function EventEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
      setRow(data);
    })();
  }, [id]);
  if (!row) return <LoadingState />;
  return <EventForm initial={row} eventId={id} />;
}
