import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { LeadQuery, LeadSortField } from '@/api/schemas'
import { useUrlParam, useUrlQuery } from '@/app/useUrlQuery'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Spinner } from '@/components/ui/Spinner'
import { useLocale } from '@/i18n/useLocale'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { LeadFilters } from './LeadFilters'
import { LeadsList } from './LeadsList'
import { useLeads } from './useLeads'

const ARRAY_KEYS = ['status']
const KEEP_KEYS = ['lead']

export function LeadsView() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const headingId = useId()
  const sortId = useId()
  const [query, setQuery] = useUrlQuery(LeadQuery, ARRAY_KEYS, KEEP_KEYS)
  const [selectedId, setSelectedId] = useUrlParam('lead')
  const leads = useLeads(query)

  const clear = () => setQuery({ status: [], city: undefined, search: undefined })
  const showSkeleton = leads.isPending
  const items = leads.data?.items
  // The new request failed but older results are still on screen: say so instead of silently showing them.
  const staleAfterError = leads.isError && !!leads.data

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 id={headingId} className="text-2xl font-semibold">
          {t('leads.title')}
        </h1>
        <p className="text-sm text-fg-muted">{t('leads.description')}</p>
      </header>

      <LeadFilters query={query} onChange={setQuery} />

      {/* Sort control for mobile, where column headers are hidden */}
      <div className="flex items-center gap-2 md:hidden">
        <label htmlFor={sortId} className="text-sm text-fg-muted">
          {t('sort.label')}
        </label>
        <Select
          id={sortId}
          size="sm"
          value={`${query.sort}:${query.dir}`}
          onChange={(e) => {
            const [sort, dir] = e.target.value.split(':') as [LeadQuery['sort'], LeadQuery['dir']]
            setQuery({ sort, dir })
          }}
          className="flex-1"
        >
          {LeadSortField.options.flatMap((f) =>
            (['desc', 'asc'] as const).map((d) => (
              <option key={`${f}:${d}`} value={`${f}:${d}`}>
                {t(`leads.columns.${f}`)} · {t(d === 'asc' ? 'sort.ascending' : 'sort.descending')}
              </option>
            )),
          )}
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-card">
        {/*
          Status toolbar. Always rendered (fixed height) so nothing shifts when it changes, and so the
          live region already exists before its text changes — screen readers skip regions inserted mid-update.
        */}
        <div
          // Hidden (not unmounted) on a hard error: ErrorState below carries its own role="alert".
          hidden={leads.isError && !leads.data}
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-2 text-sm"
        >
          <p className="tabular text-fg-muted">
            {leads.data ? t('leads.count', { total: formatNumber(leads.data.total, locale) }) : ' '}
          </p>
          <div role="status" className="flex items-center gap-2">
            {staleAfterError ? (
              <>
                <span className="text-danger">{t('errors.staleData')}</span>
                <Button size="sm" onClick={() => void leads.refetch()}>
                  {t('common.retry')}
                </Button>
              </>
            ) : (
              leads.isFetching &&
              leads.data && (
                <span className="flex items-center gap-1.5 text-fg-muted">
                  <Spinner className="size-3.5" />
                  {t('common.updating')}
                </span>
              )
            )}
          </div>
        </div>

        {leads.isError && !leads.data ? (
          <ErrorState error={leads.error} onRetry={() => void leads.refetch()} retried={leads.failureCount > 1} />
        ) : !showSkeleton && items?.length === 0 ? (
          <EmptyState
            title={t('leads.emptyTitle')}
            body={t('leads.emptyBody')}
            action={<Button onClick={clear}>{t('common.clearFilters')}</Button>}
          />
        ) : (
          // Previous results are dimmed while the new ones load, so they aren't mistaken for the new sort/filter.
          <div
            aria-busy={leads.isPlaceholderData || undefined}
            className={cn(
              'transition-opacity duration-(--duration-fast)',
              (leads.isPlaceholderData || staleAfterError) && 'opacity-60',
            )}
          >
            <LeadsList
              leads={items}
              query={query}
              selectedId={selectedId}
              onSort={(sort, dir) => setQuery({ sort, dir })}
              onSelect={setSelectedId}
            />
          </div>
        )}
      </div>

      {leads.data && leads.data.total > 0 && (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={leads.data.total}
          onPageChange={(page) => setQuery({ page })}
          onPageSizeChange={(pageSize) => setQuery({ pageSize })}
        />
      )}
    </section>
  )
}
