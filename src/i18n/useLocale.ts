import { useTranslation } from 'react-i18next'
import { directionOf, type Locale } from './config'

/** Current locale + direction, and a setter. Components use this instead of reading i18n directly. */
export function useLocale() {
  const { i18n } = useTranslation()
  const locale = (i18n.resolvedLanguage ?? 'en') as Locale
  return {
    locale,
    dir: directionOf(locale),
    setLocale: (next: Locale) => void i18n.changeLanguage(next),
  }
}
