import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/useLocale'

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const { locale, setLocale } = useLocale()
  const next = locale === 'ar' ? 'en' : 'ar'

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      // The label is written in the *target* language, so lang tells screen readers how to pronounce it.
      lang={next}
      data-testid="language-switcher"
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
    >
      {t('language.switchTo')}
    </button>
  )
}
