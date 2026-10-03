import { AdminList } from '../../components/admin/AdminList';
export default function AdminStoreItems() {
  return <AdminList table="store_items" titleKey="admin.store" createHref="/admin/store-item-create" editBase="/admin/store-item-edit" nameOf={(r, l) => (l === 'ar' ? r.title_ar : r.title_en)} />;
}
