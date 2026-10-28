import { useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '@/api/errors'
import type { Activity, AiSuggestion } from '@/api/schemas'
import { useCurrentUser } from '@/api/useSession'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SparkleIcon } from '@/components/ui/icons'
import { toast } from '@/components/ui/toast-store'
import { useLocale } from '@/i18n/useLocale'
import { formatDate, formatNumber, formatPercent, formatRelative } from '@/lib/format'
import { ApprovalDialog } from './ApprovalDialog'
import { ChangeDiff } from './ChangeValue'
import { useDismissSuggestion } from './hooks'
import { blockReason, confidenceBand } from './policy'

interface SuggestionCardProps {
  suggestion: AiSuggestion
  recordLabel: string
  currentVersion: number | undefined
  activities: Activity[]
  onShowEvidence: (activityId: string) => void
  afterApplyFocus?: RefObject<HTMLElement | null>
}

const BAND_TONE = { high: 'success', medium: 'warning', low: 'danger' } as const

export function SuggestionCard({
  suggestion: s,
  recordLabel,
  currentVersion,
  activities,
  onShowEvidence,
  afterApplyFocus,
}: SuggestionCardProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const me = useCurrentUser()
  const dismiss = useDismissSuggestion()
  const [reviewing, setReviewing] = useState(false)

  const band = confidenceBand(s.confidence)
  const blocked = blockReason(s, { currentVersion, role: me.data?.role })
  const canDismiss = blocked !== 'readOnly'

  return (
    <article
      aria-labelledby={`${s.id}-title`}
      className="flex flex-col gap-3 rounded-lg border border-ai/40 bg-ai-bg/40 p-4"
      data-testid="suggestion-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="ai">
          <SparkleIcon className="size-3.5" />
          {t('assistant.badge')}
        </Badge>
        <span className="flex items-center gap-1.5 text-xs">
          <Badge tone={BAND_TONE[band]}>{t(`assistant.confidence.${band}`)}</Badge>
          <span className="text-fg-muted">
            {t('assistant.confidence.modelReported', { value: formatPercent(s.confidence, locale) })}
          </span>
        </span>
      </header>

      <section className="flex flex-col gap-2">
        <h3 id={`${s.id}-title`} className="text-sm font-semibold">
          {t('assistant.proposedChange')}: {t(`assistant.fields.${s.change.field}`)}
        </h3>
        <ChangeDiff change={s.change} />
      </section>

      <section className="flex flex-col gap-1">
        <h4 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{t('assistant.why')}</h4>
        <p className="text-sm">{s.rationale[locale]}</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
          {t('assistant.evidence')} · {t('assistant.evidenceCount', { n: formatNumber(s.evidence.length, locale) })}
        </h4>
        <ul className="flex flex-col gap-1.5">
          {s.evidence.map((e) => {
            const activity = activities.find((a) => a.id === e.activityId)
            return (
              <li key={e.activityId} className="rounded-md border border-border bg-surface p-2 text-sm">
                <p>“{e.excerpt[locale]}”</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                  <span>
                    {activity && `${t(`activityType.${activity.type}`)} · ${formatDate(activity.occurredAt, locale)}`}
                  </span>
                  {/* Evidence link: jumps to the cited activity in the timeline so the user can verify it */}
                  <a
                    href={`#activity-${e.activityId}`}
                    onClick={(ev) => {
                      ev.preventDefault()
                      onShowEvidence(e.activityId)
                    }}
                    className="font-medium text-info underline-offset-2 hover:underline"
                  >
                    {t('assistant.goToEvidence')}
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {s.limitations.length > 0 && (
        <section className="flex flex-col gap-1">
          <h4 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{t('assistant.limitations')}</h4>
          <ul className="list-disc ps-5 text-sm">
            {s.limitations.map((l, i) => (
              <li key={i}>{l[locale]}</li>
            ))}
          </ul>
        </section>
      )}

      {band === 'low' && !blocked && <p className="text-sm text-warning">{t('assistant.confidence.lowHint')}</p>}
      {blocked && (
        <p className="rounded-md bg-surface-muted p-2 text-sm text-fg-muted" data-testid="suggestion-blocked">
          {t(`assistant.blocked.${blocked}`)}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-fg-muted">
          {/* Model id is a Latin identifier: isolate it so it neither reorders nor flips inside Arabic text. */}
          {t('assistant.generatedBy')} <bdi dir="ltr">{s.model}</bdi> · {formatRelative(s.generatedAt, locale)}
        </span>
        <div className="flex gap-2">
          {canDismiss && (
            <Button
              size="sm"
              variant="ghost"
              loading={dismiss.isPending}
              onClick={() =>
                dismiss.mutate(s, {
                  onSuccess: () => toast(t('assistant.dismissed'), 'info'),
                  onError: (e) => toast(t(`errors.${isApiError(e) ? e.code : 'SERVER'}`), 'danger'),
                })
              }
            >
              {t('assistant.dismiss')}
            </Button>
          )}
          {/* Not hidden when blocked: a disabled button with a visible reason explains *why* it can't be applied */}
          <Button size="sm" variant="ai" disabled={!!blocked} onClick={() => setReviewing(true)}>
            {t('assistant.review')}
          </Button>
        </div>
      </footer>

      {currentVersion !== undefined && (
        <ApprovalDialog
          open={reviewing}
          onClose={() => setReviewing(false)}
          suggestion={s}
          recordLabel={recordLabel}
          currentVersion={currentVersion}
          afterApplyFocus={afterApplyFocus}
        />
      )}
    </article>
  )
}
