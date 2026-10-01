import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { CompanyForm } from '../../../components/admin/CompanyForm';
import { LoadingState } from '../../../components/ui/States';

export default function CompanyEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
      setRow(data);
    })();
  }, [id]);
  if (!row) return <LoadingState />;
  return <CompanyForm initial={row} companyId={id} />;
}
