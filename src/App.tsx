import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLocale } from '@/i18n/useLocale'
import { formatCurrency, formatDate, formatPercent, formatRelative } from '@/lib/format'

export default function App() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div>
          <p className="text-lg font-semibold">{t('app.name')}</p>
          <p className="text-sm text-fg-muted">{t('app.tagline')}</p>
        </div>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto max-w-3xl p-6">
        {/* Temporary locale check — replaced by the real views in later steps */}
        <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-6 shadow-card">
          <dt className="text-fg-muted">{t('nav.opportunities')}</dt>
          <dd className="tabular text-end">{formatCurrency(1250000, locale)}</dd>
          <dt className="text-fg-muted">%</dt>
          <dd className="tabular text-end">{formatPercent(0.72, locale)}</dd>
          <dt className="text-fg-muted">Date</dt>
          <dd className="tabular text-end">{formatDate('2026-10-29T10:00:00Z', locale)}</dd>
          <dt className="text-fg-muted">Relative</dt>
          <dd className="text-end">{formatRelative(threeDaysAgo, locale)}</dd>
        </dl>
      </main>
    </>
  )
}
