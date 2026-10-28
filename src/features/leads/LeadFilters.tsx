import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { City, LeadStatus, type LeadQuery } from '@/api/schemas'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

interface LeadFiltersProps {
  query: LeadQuery
  onChange: (patch: Partial<LeadQuery>, opts?: { replace?: boolean }) => void
}

export function LeadFilters({ query, onChange }: LeadFiltersProps) {
  const { t } = useTranslation()
  const searchId = useId()
  const cityId = useId()

  // Local input state, debounced into the URL — avoids a request per keystroke.
  const [search, setSearch] = useState(query.search ?? '')
  const debounced = useDebouncedValue(search, 300)
  useEffect(() => {
    if (debounced !== (query.search ?? '')) onChange({ search: debounced || undefined }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value
  }, [debounced])
  // Keep the input in sync when the URL changes externally (Back button, "Clear filters").
  useEffect(() => setSearch(query.search ?? ''), [query.search])

  const toggleStatus = (s: LeadStatus) =>
    onChange({ status: query.status.includes(s) ? query.status.filter((x) => x !== s) : [...query.status, s] })

  const hasFilters = query.status.length > 0 || !!query.city || !!query.search

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="flex flex-col gap-1 md:w-72">
        <label htmlFor={searchId} className="text-sm font-medium">
          {t('common.search')}
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('leads.searchPlaceholder')}
          className="h-10 rounded-md border border-border bg-surface px-3"
        />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">{t('leads.filterStatus')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {LeadStatus.options.map((s) => {
            const checked = query.status.includes(s)
            return (
              // Real checkboxes styled as chips: native keyboard (Space) and checked-state semantics.
              <label
                key={s}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                  checked ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface hover:bg-surface-muted',
                )}
              >
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleStatus(s)} />
                {t(`leadStatus.${s}`)}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={cityId} className="text-sm font-medium">
          {t('leads.filterCity')}
        </label>
        <select
          id={cityId}
          value={query.city ?? ''}
          onChange={(e) => onChange({ city: (e.target.value || undefined) as LeadQuery['city'] })}
          className="h-10 rounded-md border border-border bg-surface px-3"
        >
          <option value="">{t('leads.anyCity')}</option>
          {City.options.map((c) => (
            <option key={c} value={c}>
              {t(`city.${c}`)}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button variant="ghost" onClick={() => onChange({ status: [], city: undefined, search: undefined })}>
          {t('common.clearFilters')}
        </Button>
      )}
    </div>
  )
}
