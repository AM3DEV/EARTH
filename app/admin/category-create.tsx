import { CategoryForm } from '../../components/admin/CategoryForm';

export default function CategoryCreate() {
  return <CategoryForm initial={{ type: 'company' }} />;
}
