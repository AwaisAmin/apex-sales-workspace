import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '@/api/errors'
import type { AiSuggestion } from '@/api/schemas'
import { useCurrentUser } from '@/api/useSession'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/Toast'
import { useLocale } from '@/i18n/useLocale'
import { formatPercent } from '@/lib/format'
import { ChangeDiff } from './ChangeValue'
import { useApplySuggestion } from './hooks'
import { confidenceBand, requiresAcknowledgement } from './policy'

interface ApprovalDialogProps {
  suggestion: AiSuggestion
  recordLabel: string
  currentVersion: number
  open: boolean
  onClose: () => void
}

/**
 * The human-approval gate. This dialog is the ONLY path from an AI suggestion to a write:
 * it restates the exact change, defaults focus to Cancel, requires an explicit
 * acknowledgement for low-confidence suggestions, and cannot be dismissed mid-write.
 */
export function ApprovalDialog({ suggestion, recordLabel, currentVersion, open, onClose }: ApprovalDialogProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const me = useCurrentUser()
  const titleId = useId()
  const descId = useId()
  const ackId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const apply = useApplySuggestion()

  const needsAck = requiresAcknowledgement(suggestion)
  const band = confidenceBand(suggestion.confidence)
  const canConfirm = !apply.isPending && (!needsAck || acknowledged)

  const close = () => {
    apply.reset()
    setAcknowledged(false)
    onClose()
  }

  const confirm = () =>
    apply.mutate(
      { suggestion, version: currentVersion },
      {
        onSuccess: () => {
          toast(t('approval.applied'))
          close()
        },
      },
    )

  const error = apply.error
  const errorMessage =
    error && isApiError(error) && error.code === 'CONFLICT'
      ? t('approval.staleError')
      : error
        ? `${t(`errors.${isApiError(error) ? error.code : 'SERVER'}`)} ${t('approval.failed')}`
        : null

  return (
    <Dialog
      open={open}
      onClose={close}
      labelledBy={titleId}
      describedBy={descId}
      variant="center"
      initialFocus={cancelRef}
      dismissible={!apply.isPending}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {t('approval.title')}
          </h2>
          <p id={descId} className="text-sm text-fg-muted">
            {t('approval.intro')}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted/40 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-fg-muted">{t('approval.record')}</span>
            <span className="font-medium">{recordLabel}</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-fg-muted">{t('approval.change')}</span>
            <span className="font-medium">{t(`assistant.fields.${suggestion.change.field}`)}</span>
          </div>
          <ChangeDiff change={suggestion.change} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={band === 'low' ? 'danger' : band === 'medium' ? 'warning' : 'success'}>
              {t(`assistant.confidence.${band}`)}
            </Badge>
            <span className="text-fg-muted">
              {t('assistant.confidence.modelReported', { value: formatPercent(suggestion.confidence, locale) })}
            </span>
          </div>
        </div>

        {needsAck && (
          <div className="flex items-start gap-2 rounded-md bg-warning-bg p-3 text-sm text-warning">
            <input
              id={ackId}
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-(--color-warning)"
            />
            <label htmlFor={ackId}>{t('approval.acknowledge')}</label>
          </div>
        )}

        <p className="text-xs text-fg-muted">{t('approval.audit', { name: me.data?.name[locale] ?? '…' })}</p>

        {errorMessage && (
          <p role="alert" className="rounded-md bg-danger-bg p-3 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} onClick={close} disabled={apply.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={confirm}
            disabled={!canConfirm || (!!error && isApiError(error) && error.code === 'CONFLICT')}
            loading={apply.isPending}
            data-testid="approve-apply"
          >
            {apply.isPending ? t('approval.applying') : t('approval.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
