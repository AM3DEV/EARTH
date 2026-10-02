import { AdminList } from '../../components/admin/AdminList';
export default function AdminMonuments() {
  return <AdminList table="monuments" titleKey="admin.monuments" createHref="/admin/monument-create" editBase="/admin/monument-edit" hideToggle nameOf={(r, l) => (l === 'ar' ? r.name_ar : r.name_en)} />;
}
