import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { ar } from './locales/ar'

export const LOCALES = ['en', 'ar'] as const
export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'apex.locale'

export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}

// Storage can throw (private mode, blocked site data) — locale is a convenience, never fatal.
export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

export function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

function initialLocale(): Locale {
  const stored = readStoredLocale()
  if (stored) return stored
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

/** Keep <html lang/dir> in sync so CSS logical properties, :lang() and screen readers all follow. */
export function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale
  document.documentElement.dir = directionOf(locale)
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
})

applyDocumentLocale(i18n.language as Locale)
i18n.on('languageChanged', (lng) => {
  if (!isLocale(lng)) return
  applyDocumentLocale(lng)
  storeLocale(lng)
})

export default i18n
