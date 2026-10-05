import { useLocalSearchParams } from 'expo-router';
import { CompanyForm } from '../../components/admin/CompanyForm';

export default function CompanyCreate() {
  const { parent_id } = useLocalSearchParams<{ parent_id?: string }>();
  const pid = Array.isArray(parent_id) ? parent_id[0] : parent_id;
  return <CompanyForm initial={{ active: true, verified: false, parent_company_id: pid ?? null }} />;
}
