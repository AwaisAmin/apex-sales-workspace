import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/useLocale'
import type { Paginated } from '@/api/schemas'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

interface DataPanelProps<T> {
  result: UseQueryResult<Paginated<T>> & { isPlaceholderData: boolean }
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  /** e.g. "{{total}} leads" — receives the formatted total. */
  countLabel: (total: string) => string
  empty: { title: string; body: string; onClear: () => void }
  /** Renders the list; `items` is undefined while the first page loads (render skeletons). */
  children: (items: T[] | undefined) => ReactNode
}

/**
 * Every paginated list's loading / empty / error / refreshing behaviour in one place,
 * so Leads and Opportunities (and any future list) behave identically:
 *  - first load → skeletons (rendered by the child)
 *  - page/sort/filter change → previous rows stay, dimmed, with "Updating…" in the toolbar
 *  - hard error → localized ErrorState with retry when retrying can help
 *  - failed background refresh → previous rows stay, with an explicit "showing previous" warning
 */
export function DataPanel<T>({
  result,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  countLabel,
  empty,
  children,
}: DataPanelProps<T>) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { data } = result
  const hardError = result.isError && !data
  const staleAfterError = result.isError && !!data

  return (
    <>
      <div className="rounded-lg border border-border bg-surface shadow-card">
        {/*
          Status toolbar. Always rendered (fixed height) so nothing shifts when it changes, and so the
          live region already exists before its text changes — screen readers skip regions inserted mid-update.
          Hidden (not unmounted) on a hard error: ErrorState carries its own role="alert".
        */}
        <div
          hidden={hardError}
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-2 text-sm"
        >
          <p className="tabular text-fg-muted">{data ? countLabel(formatNumber(data.total, locale)) : ' '}</p>
          <div role="status" className="flex items-center gap-2">
            {staleAfterError ? (
              <>
                <span className="text-danger">{t('errors.staleData')}</span>
                <Button size="sm" onClick={() => void result.refetch()}>
                  {t('common.retry')}
                </Button>
              </>
            ) : (
              result.isFetching &&
              data && (
                <span className="flex items-center gap-1.5 text-fg-muted">
                  <Spinner className="size-3.5" />
                  {t('common.updating')}
                </span>
              )
            )}
          </div>
        </div>

        {hardError ? (
          <ErrorState error={result.error} onRetry={() => void result.refetch()} retried={result.failureCount > 1} />
        ) : data?.items.length === 0 ? (
          <EmptyState
            title={empty.title}
            body={empty.body}
            action={<Button onClick={empty.onClear}>{t('common.clearFilters')}</Button>}
          />
        ) : (
          // Previous results are dimmed while new ones load, so they aren't mistaken for the new sort/filter.
          <div
            aria-busy={result.isPlaceholderData || undefined}
            className={cn(
              'transition-opacity duration-(--duration-fast)',
              (result.isPlaceholderData || staleAfterError) && 'opacity-60',
            )}
          >
            {children(data?.items)}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </>
  )
}
