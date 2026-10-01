import { AdminList } from '../../components/admin/AdminList';
export default function AdminServices() {
  return <AdminList table="services" titleKey="admin.services" createHref="/admin/service-create" editBase="/admin/service-edit" nameOf={(r, l) => (l === 'ar' ? r.name_ar : r.name_en)} />;
}
