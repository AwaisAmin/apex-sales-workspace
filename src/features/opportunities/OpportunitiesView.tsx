import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { OpportunityQuery, OpportunitySortField, OpportunityStage } from '@/api/schemas'
import { useUrlParam, useUrlQuery } from '@/app/useUrlQuery'
import { DataPanel } from '@/components/DataPanel'
import { Button } from '@/components/ui/Button'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { MobileSort } from '@/components/ui/MobileSort'
import { SearchField } from '@/components/ui/SearchField'
import { usePagedQuery } from '@/lib/usePagedQuery'
import { OpportunitiesList } from './OpportunitiesList'

const ARRAY_KEYS = ['stage']
const KEEP_KEYS = ['opp']

export function OpportunitiesView() {
  const { t } = useTranslation()
  const headingId = useId()
  const [query, setQuery] = useUrlQuery(OpportunityQuery, ARRAY_KEYS, KEEP_KEYS)
  const [selectedId, setSelectedId] = useUrlParam('opp')
  const result = usePagedQuery({ query, key: qk.opportunities.list, fetch: api.listOpportunities })

  const clear = () => setQuery({ stage: [], search: undefined })
  const hasFilters = query.stage.length > 0 || !!query.search

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 id={headingId} className="text-2xl font-semibold">
          {t('opportunities.title')}
        </h1>
        <p className="text-sm text-fg-muted">{t('opportunities.description')}</p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <SearchField
          label={t('common.search')}
          placeholder={t('opportunities.searchPlaceholder')}
          value={query.search}
          onSearch={(search) => setQuery({ search }, { replace: true })}
        />
        <ChipGroup
          legend={t('opportunities.filterStage')}
          options={OpportunityStage.options}
          selected={query.stage}
          label={(s) => t(`stage.${s}`)}
          onChange={(stage) => setQuery({ stage })}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={clear}>
            {t('common.clearFilters')}
          </Button>
        )}
      </div>

      <MobileSort
        fields={OpportunitySortField.options}
        sort={query.sort}
        dir={query.dir}
        label={(f) => t(`opportunities.columns.${f}`)}
        onChange={(sort, dir) => setQuery({ sort, dir })}
      />

      <DataPanel
        result={result}
        page={query.page}
        pageSize={query.pageSize}
        onPageChange={(page) => setQuery({ page })}
        onPageSizeChange={(pageSize) => setQuery({ pageSize })}
        countLabel={(total) => t('opportunities.count', { total })}
        empty={{ title: t('opportunities.emptyTitle'), body: t('opportunities.emptyBody'), onClear: clear }}
      >
        {(items) => (
          <OpportunitiesList
            items={items}
            query={query}
            selectedId={selectedId}
            onSort={(sort, dir) => setQuery({ sort, dir })}
            onSelect={setSelectedId}
          />
        )}
      </DataPanel>
    </section>
  )
}
