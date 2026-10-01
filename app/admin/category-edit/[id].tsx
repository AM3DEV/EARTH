import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { CategoryForm } from '../../../components/admin/CategoryForm';
import { LoadingState } from '../../../components/ui/States';

export default function CategoryEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
      setRow(data);
    })();
  }, [id]);
  if (!row) return <LoadingState />;
  return <CategoryForm initial={row} categoryId={id} />;
}
