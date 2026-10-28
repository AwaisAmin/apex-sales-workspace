import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsers } from '@/api/useSession'
import { useLocale } from '@/i18n/useLocale'
import { formatRelative } from '@/lib/format'
import { useAudit } from './hooks'

/** Per-record audit trail: shows which changes came from approved AI suggestions and who approved them. */
export function AuditHistory({ targetId }: { targetId: string }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const headingId = useId()
  const audit = useAudit()
  const users = useUsers()
  const entries = audit.data?.filter((e) => e.targetId === targetId) ?? []
  const actor = (id: string) => users.data?.find((u) => u.id === id)?.name[locale] ?? id
  const label = {
    suggestion_applied: t('detail.historyAi'),
    suggestion_dismissed: t('detail.historyDismissed'),
    update: t('detail.historyManual'),
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2" data-testid="audit-history">
      <h2 id={headingId} className="text-base font-semibold">
        {t('detail.history')}
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('detail.noHistory')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="rounded-md border border-border p-2">
              <p className="font-medium">{label[e.action]}</p>
              <p className="text-xs text-fg-muted">
                {actor(e.actorId)} · {formatRelative(e.at, locale)}
              </p>
              {/* Raw server summary (field: from → to); kept LTR so arrows/identifiers read correctly in Arabic */}
              <p dir="ltr" className="mt-0.5 font-mono text-xs text-fg-muted">
                {e.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
