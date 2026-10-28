import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '@/api/errors'
import { LEAD_TRANSITIONS } from '@/api/rules'
import type { Lead, LeadStatus } from '@/api/schemas'
import { useCurrentUser } from '@/api/useSession'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { useUpdateLeadStatus } from './useUpdateLeadStatus'

/**
 * Explicit "choose, then Save" rather than saving on <select> change: in some browsers
 * arrow keys on a closed select fire `change`, which would save while the user is
 * just browsing options with the keyboard.
 */
export function LeadStatusControl({ lead }: { lead: Lead }) {
  const { t } = useTranslation()
  const id = useId()
  const me = useCurrentUser()
  const update = useUpdateLeadStatus()
  const options = LEAD_TRANSITIONS[lead.status]
  const [next, setNext] = useState<LeadStatus | ''>('')
  const [failure, setFailure] = useState<{ message: string; revertedTo: LeadStatus } | null>(null)

  const readOnly = me.data?.role !== 'rep' && me.data?.role !== 'manager'

  const save = () => {
    if (!next) return
    const previous = lead.status
    setFailure(null)
    update.mutate(
      { lead, status: next },
      {
        onSuccess: () => toast(t('statusControl.saved', { status: t(`leadStatus.${next}`) })),
        onError: (e) =>
          setFailure({
            message: t(`errors.${isApiError(e) ? e.code : 'SERVER'}`),
            revertedTo: previous,
          }),
        onSettled: () => setNext(''),
      },
    )
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-3" data-testid="status-control">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {t('statusControl.label')}
          </label>
          <Select
            id={id}
            value={next}
            onChange={(e) => setNext(e.target.value as LeadStatus | '')}
            disabled={readOnly || update.isPending || options.length === 0}
          >
            <option value="">{t('statusControl.choose')}</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {t(`leadStatus.${s}`)}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="primary" onClick={save} disabled={readOnly || !next} loading={update.isPending}>
          {t('statusControl.save')}
        </Button>
      </div>

      {/* Live region exists before it is filled, so the outcome is announced. */}
      <div aria-live="polite" className="text-sm">
        {update.isPending && (
          <span className="flex items-center gap-1.5 text-fg-muted">
            <Spinner className="size-3.5" />
            {t('statusControl.saving')}
          </span>
        )}
      </div>
      {failure && (
        <p role="alert" className="rounded-md bg-danger-bg p-2 text-sm text-danger" data-testid="status-rollback">
          {t('statusControl.reverted', { reason: failure.message, status: t(`leadStatus.${failure.revertedTo}`) })}
        </p>
      )}
      {readOnly && <p className="text-xs text-fg-muted">{t('statusControl.readOnly')}</p>}
    </section>
  )
}
