import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { LeadQuery, LeadSortField } from '@/api/schemas'
import { useUrlParam, useUrlQuery } from '@/app/useUrlQuery'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Spinner } from '@/components/ui/Spinner'
import { LeadFilters } from './LeadFilters'
import { LeadsList } from './LeadsList'
import { useLeads } from './useLeads'

const ARRAY_KEYS = ['status']
const KEEP_KEYS = ['lead']

export function LeadsView() {
  const { t } = useTranslation()
  const headingId = useId()
  const sortId = useId()
  const [query, setQuery] = useUrlQuery(LeadQuery, ARRAY_KEYS, KEEP_KEYS)
  const [selectedId, setSelectedId] = useUrlParam('lead')
  const leads = useLeads(query)

  const clear = () => setQuery({ status: [], city: undefined, search: undefined })
  const showSkeleton = leads.isPending
  const items = leads.data?.items

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

      <div
        className="relative rounded-lg border border-border bg-surface shadow-card"
        aria-busy={leads.isFetching || undefined}
      >
        {/* Background refresh indicator: data stays visible, so no layout shift */}
        {leads.isPlaceholderData && (
          <div className="absolute inset-e-3 top-2 z-10 flex items-center gap-1.5 rounded-sm bg-surface px-2 py-1 text-xs text-fg-muted shadow-card">
            <Spinner className="size-3.5" />
            <span role="status">{t('common.updating')}</span>
          </div>
        )}

        {leads.isError && !leads.data ? (
          <ErrorState error={leads.error} onRetry={() => void leads.refetch()} retried={leads.failureCount > 1} />
        ) : !showSkeleton && items?.length === 0 ? (
          <EmptyState
            title={t('leads.emptyTitle')}
            body={t('leads.emptyBody')}
            action={<Button onClick={clear}>{t('common.clearFilters')}</Button>}
          />
        ) : (
          <LeadsList
            leads={items}
            query={query}
            selectedId={selectedId}
            onSort={(sort, dir) => setQuery({ sort, dir })}
            onSelect={setSelectedId}
          />
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
