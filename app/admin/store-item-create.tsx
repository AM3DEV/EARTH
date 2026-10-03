import { StoreItemForm } from '../../components/admin/StoreItemForm';

export default function StoreItemCreate() {
  return <StoreItemForm initial={{ kind: 'percent', active: true }} />;
}
