import { StaticPage } from '../components/StaticPage';
import { useTranslation } from 'react-i18next';
export default function About() {
  const { t } = useTranslation();
  return <StaticPage title={t('settings.about')} body={t('settings.aboutBody')} />;
}
