import { CompanyForm } from '../../components/admin/CompanyForm';

export default function CompanyCreate() {
  return <CompanyForm initial={{ active: true, verified: false }} />;
}
