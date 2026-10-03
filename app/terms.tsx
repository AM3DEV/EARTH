import { StaticPage } from '../components/StaticPage';
import { useTranslation } from 'react-i18next';
export default function Terms() {
  const { t } = useTranslation();
  return <StaticPage title={t('settings.terms')} body={t('settings.termsBody')} />;
}
