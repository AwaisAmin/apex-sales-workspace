import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { LeadQuery, LeadSortField } from '@/api/schemas'
import { useUrlParam, useUrlQuery } from '@/app/useUrlQuery'
import { DataPanel } from '@/components/DataPanel'
import { MobileSort } from '@/components/ui/MobileSort'
import { LeadDetailPanel } from './LeadDetailPanel'
import { LeadFilters } from './LeadFilters'
import { LeadsList } from './LeadsList'
import { useLeads } from './useLeads'

const ARRAY_KEYS = ['status']
const KEEP_KEYS = ['lead']

export function LeadsView() {
  const { t } = useTranslation()
  const headingId = useId()
  const [query, setQuery] = useUrlQuery(LeadQuery, ARRAY_KEYS, KEEP_KEYS)
  const [selectedId, setSelectedId] = useUrlParam('lead')
  const leads = useLeads(query)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 id={headingId} className="text-2xl font-semibold">
          {t('leads.title')}
        </h1>
        <p className="text-sm text-fg-muted">{t('leads.description')}</p>
      </header>

      <LeadFilters query={query} onChange={setQuery} />

      <MobileSort
        fields={LeadSortField.options}
        sort={query.sort}
        dir={query.dir}
        label={(f) => t(`leads.columns.${f}`)}
        onChange={(sort, dir) => setQuery({ sort, dir })}
      />

      <DataPanel
        result={leads}
        page={query.page}
        pageSize={query.pageSize}
        onPageChange={(page) => setQuery({ page })}
        onPageSizeChange={(pageSize) => setQuery({ pageSize })}
        countLabel={(total) => t('leads.count', { total })}
        empty={{
          title: t('leads.emptyTitle'),
          body: t('leads.emptyBody'),
          onClear: () => setQuery({ status: [], city: undefined, search: undefined }),
        }}
      >
        {(items) => (
          <LeadsList
            leads={items}
            query={query}
            selectedId={selectedId}
            onSort={(sort, dir) => setQuery({ sort, dir })}
            onSelect={setSelectedId}
          />
        )}
      </DataPanel>

      <LeadDetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} />
    </section>
  )
}
