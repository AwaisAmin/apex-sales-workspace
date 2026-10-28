import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogCloseButton } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'

interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  /** Visible heading; falls back to `fallbackTitle` while the record loads. */
  title: string | undefined
  fallbackTitle: string
  subtitle?: ReactNode
  status: 'pending' | 'error' | 'success'
  error?: unknown
  onRetry?: () => void
  children: ReactNode
}

/** Side panel for a single record, with shared loading / error handling. Full-screen on mobile. */
export function DetailDrawer({ open, onClose, title, fallbackTitle, subtitle, status, error, onRetry, children }: DetailDrawerProps) {
  const { t } = useTranslation()
  const titleId = useId()

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} variant="drawer">
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h1 id={titleId} className="truncate text-lg font-semibold">
              {title ?? fallbackTitle}
            </h1>
            {subtitle && <div className="mt-0.5 text-sm text-fg-muted">{subtitle}</div>}
          </div>
          <DialogCloseButton onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {status === 'pending' ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="sr-only">{t('common.loading')}</span>
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-4 h-32 w-full" />
            </div>
          ) : status === 'error' ? (
            <ErrorState error={error} onRetry={onRetry} />
          ) : (
            <div className="flex flex-col gap-6">{children}</div>
          )}
        </div>
      </div>
    </Dialog>
  )
}

/** Two-column label/value list used in record summaries. */
export function FieldList({ fields }: { fields: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {fields.map((f) => (
        <div key={f.label} className="contents">
          <dt className="text-fg-muted">{f.label}</dt>
          <dd className="min-w-0 break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
