import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '@/api/errors'
import { LEAD_TRANSITIONS } from '@/api/rules'
import type { Lead, LeadStatus } from '@/api/schemas'
import { useCurrentUser } from '@/api/useSession'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chevron } from '@/components/ui/icons'
import { toast } from '@/components/ui/toast-store'
import { cn } from '@/lib/cn'
import { useUpdateLeadStatus } from './useUpdateLeadStatus'

/** The forward pipeline. "Unqualified" is an exit from it, so it is shown separately, not as a step. */
const PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified']

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn('size-3.5', className)}>
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PipelineStepper({ status }: { status: LeadStatus }) {
  const { t } = useTranslation()
  const current = PIPELINE.indexOf(status) // -1 when unqualified

  return (
    <ol className="flex flex-wrap items-center gap-1 text-sm" aria-label={t('statusControl.pipeline')}>
      {PIPELINE.map((step, i) => {
        const done = current > i
        const active = current === i
        return (
          <li key={step} className="flex items-center gap-1" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
                active && 'bg-primary font-semibold text-primary-fg',
                done && 'text-success',
                !active && !done && 'text-fg-muted',
              )}
            >
              {done ? (
                <CheckIcon />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-full', active ? 'bg-primary-fg' : 'border border-current')}
                />
              )}
              {t(`leadStatus.${step}`)}
            </span>
            {/* Separator points along the reading direction (flips in RTL). */}
            {i < PIPELINE.length - 1 && <Chevron direction="end" className="size-3.5 text-fg-muted" />}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Status shown as a pipeline, with the allowed next moves as one-click actions.
 * Only transitions the server accepts are offered (LEAD_TRANSITIONS); the server still enforces them.
 * The change itself is optimistic with rollback (see useUpdateLeadStatus).
 */
export function LeadStatusControl({ lead }: { lead: Lead }) {
  const { t } = useTranslation()
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const me = useCurrentUser()
  const update = useUpdateLeadStatus()
  const [target, setTarget] = useState<LeadStatus | null>(null)
  const [failure, setFailure] = useState<{ message: string; revertedTo: LeadStatus } | null>(null)

  const readOnly = me.data?.role !== 'rep' && me.data?.role !== 'manager'
  const moves = LEAD_TRANSITIONS[lead.status]

  const move = (next: LeadStatus) => {
    const previous = lead.status
    setFailure(null)
    setTarget(next)
    // The optimistic update re-renders the action buttons, removing the one that was just pressed;
    // without this, keyboard focus would fall back to <body> and the user would lose their place.
    requestAnimationFrame(() => headingRef.current?.focus())
    update.mutate(
      { lead, status: next },
      {
        onSuccess: () => toast(t('statusControl.saved', { status: t(`leadStatus.${next}`) })),
        onError: (e) => setFailure({ message: t(`errors.${isApiError(e) ? e.code : 'SERVER'}`), revertedTo: previous }),
        onSettled: () => setTarget(null),
      },
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
      data-testid="status-control"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-sm font-semibold focus:outline-none">
          {t('statusControl.label')}
        </h2>
        {lead.status === 'unqualified' && <Badge tone="neutral">{t('leadStatus.unqualified')}</Badge>}
      </div>

      <PipelineStepper status={lead.status} />

      {readOnly ? (
        <p className="text-xs text-fg-muted">{t('statusControl.readOnly')}</p>
      ) : (
        moves.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {moves.map((s) => {
              // Moving forward in the pipeline is the primary action; leaving it is secondary.
              const forward = PIPELINE.indexOf(s) > PIPELINE.indexOf(lead.status) && s !== 'unqualified'
              return (
                <Button
                  key={s}
                  size="sm"
                  variant={forward ? 'primary' : 'secondary'}
                  className={cn(s === 'unqualified' && 'text-danger')}
                  loading={update.isPending && target === s}
                  disabled={update.isPending && target !== s}
                  onClick={() => move(s)}
                >
                  {forward && !(update.isPending && target === s) && <CheckIcon />}
                  {t('statusControl.markAs', { status: t(`leadStatus.${s}`) })}
                </Button>
              )
            })}
          </div>
        )
      )}

      {/* Live region exists before it is filled, so the outcome is announced. */}
      <div aria-live="polite" className="text-xs text-fg-muted empty:hidden">
        {update.isPending && t('statusControl.saving')}
      </div>
      {failure && (
        <p role="alert" className="rounded-md bg-danger-bg p-2 text-sm text-danger" data-testid="status-rollback">
          {t('statusControl.reverted', { reason: failure.message, status: t(`leadStatus.${failure.revertedTo}`) })}
        </p>
      )}
    </section>
  )
}
