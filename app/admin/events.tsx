import { AdminList } from '../../components/admin/AdminList';
export default function AdminEvents() {
  return <AdminList table="events" titleKey="admin.events" createHref="/admin/event-create" editBase="/admin/event-edit" nameOf={(r, l) => (l === 'ar' ? r.title_ar : r.title_en)} />;
}
