import { AdminList } from '../../components/admin/AdminList';
export default function AdminCompanies() {
  return <AdminList table="companies" titleKey="admin.companies" createHref="/admin/company-create" editBase="/admin/company-edit" nameOf={(r, l) => (l === 'ar' ? r.name_ar : r.name_en)} />;
}
