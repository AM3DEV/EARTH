import { StaticPage } from '../components/StaticPage';
import { useTranslation } from 'react-i18next';
export default function Privacy() {
  const { t } = useTranslation();
  return <StaticPage title={t('settings.privacy')} body={t('settings.privacyBody')} />;
}
