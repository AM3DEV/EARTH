import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { supabase } from './supabase';
import en from '../locales/en/common.json';
import ar from '../locales/ar/common.json';
import fr from '../locales/fr/common.json';
import de from '../locales/de/common.json';
import es from '../locales/es/common.json';
import it from '../locales/it/common.json';
import ru from '../locales/ru/common.json';
import tr from '../locales/tr/common.json';
import zh from '../locales/zh/common.json';
import nl from '../locales/nl/common.json';

const LANG_KEY = 'jg.lang';

/** The 10 supported languages — shown on the welcome screen + settings. */
export const LANGS = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'de', name: 'Deutsch', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'it', name: 'Italiano', rtl: false },
  { code: 'ru', name: 'Русский', rtl: false },
  { code: 'tr', name: 'Türkçe', rtl: false },
  { code: 'zh', name: '中文', rtl: false },
  { code: 'nl', name: 'Nederlands', rtl: false },
] as const;

export type LangCode = (typeof LANGS)[number]['code'];

export function isSupportedLang(lng: string): lng is LangCode {
  return (LANGS as readonly { code: string }[]).some((l) => l.code === lng);
}

export async function loadLocale(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    return saved && isSupportedLang(saved) ? saved : 'en';
  } catch {
    return 'en';
  }
}

export async function persistLocale(lng: string) {
  try { await AsyncStorage.setItem(LANG_KEY, lng); } catch {}
}

/** Apply a language everywhere: persist, switch i18n, fix RTL, sync profile. */
export async function applyLocale(lng: string) {
  const code = isSupportedLang(lng) ? lng : 'en';
  await persistLocale(code);
  await i18n.changeLanguage(code);
  const rtl = code === 'ar';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ language: code }).eq('id', user.id);
  } catch {}
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(rtl);
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
      it: { translation: it },
      ru: { translation: ru },
      tr: { translation: tr },
      zh: { translation: zh },
      nl: { translation: nl },
    },
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
