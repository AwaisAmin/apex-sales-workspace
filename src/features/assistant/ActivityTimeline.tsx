import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Activity } from '@/api/schemas'
import { useLocale } from '@/i18n/useLocale'
import { formatDate } from '@/lib/format'
import { activityAnchor } from './focusActivity'

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-base font-semibold">
        {t('detail.activities')}
      </h2>
      {activities.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('detail.noActivities')}</p>
      ) : (
        <ol className="flex flex-col gap-2 border-s-2 border-border ps-4">
          {activities.map((a) => (
            <li
              key={a.id}
              id={activityAnchor(a.id)}
              // Focusable only programmatically (from evidence links), not a tab stop.
              tabIndex={-1}
              className="rounded-md p-2 text-sm transition-colors duration-300 data-[highlight=true]:bg-ai-bg data-[highlight=true]:ring-2 data-[highlight=true]:ring-ai"
            >
              <p className="text-xs text-fg-muted">
                {t(`activityType.${a.type}`)} · <time dateTime={a.occurredAt}>{formatDate(a.occurredAt, locale)}</time>
              </p>
              <p>{a.summary[locale]}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
