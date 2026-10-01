import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import en from '../locales/en/common.json';
import ar from '../locales/ar/common.json';

const LANG_KEY = 'jg.lang';

export async function loadLocale(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    return saved === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export async function persistLocale(lng: string) {
  try { await AsyncStorage.setItem(LANG_KEY, lng); } catch {}
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  loadLocale().then((lng) => {
    i18n.changeLanguage(lng);
    const rtl = lng === 'ar';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(rtl);
    }
  });
}

export function isRTL() {
  return i18n.language === 'ar';
}

export default i18n;
