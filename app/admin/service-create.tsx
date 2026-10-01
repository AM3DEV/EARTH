import { ServiceForm } from '../../components/admin/ServiceForm';

export default function ServiceCreate() {
  return <ServiceForm initial={{ base_price: 0, currency: 'USD', max_booking: 100, current_booking: 0, available: true }} />;
}
