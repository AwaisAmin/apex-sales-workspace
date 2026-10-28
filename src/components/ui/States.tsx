import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '@/api/errors'
import { Button } from './Button'

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-fg-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/**
 * Maps any error to a localized, actionable message. Retry is offered only when
 * retrying can help (transient errors) — not for 403/422, where it would just fail again.
 */
export function ErrorState({ error, onRetry, retried = false }: { error: unknown; onRetry?: () => void; retried?: boolean }) {
  const { t } = useTranslation()
  const code = isApiError(error) ? error.code : 'SERVER'
  const canRetry = onRetry && (!isApiError(error) || error.isTransient || code === 'INVALID_RESPONSE')

  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <p className="font-semibold text-danger">{t(`errors.${code}`)}</p>
      {retried && <p className="text-sm text-fg-muted">{t('errors.retriedNote')}</p>}
      {canRetry && (
        <Button className="mt-2" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
