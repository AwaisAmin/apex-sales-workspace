import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Activity } from '@/api/schemas'
import { useLocale } from '@/i18n/useLocale'
import { formatDate } from '@/lib/format'

export const activityAnchor = (id: string) => `activity-${id}`

/** Move focus to a cited activity and briefly highlight it — the target of an evidence link. */
export function focusActivity(id: string) {
  const el = document.getElementById(activityAnchor(id))
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
  el.dataset.highlight = 'true'
  setTimeout(() => delete el.dataset.highlight, 2000)
}

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
