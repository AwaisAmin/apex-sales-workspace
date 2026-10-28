import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { City, LeadStatus, type LeadQuery } from '@/api/schemas'
import { Button } from '@/components/ui/Button'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { SearchField } from '@/components/ui/SearchField'
import { Select } from '@/components/ui/Select'

interface LeadFiltersProps {
  query: LeadQuery
  onChange: (patch: Partial<LeadQuery>, opts?: { replace?: boolean }) => void
}

export function LeadFilters({ query, onChange }: LeadFiltersProps) {
  const { t } = useTranslation()
  const cityId = useId()
  const hasFilters = query.status.length > 0 || !!query.city || !!query.search

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <SearchField
        label={t('common.search')}
        placeholder={t('leads.searchPlaceholder')}
        value={query.search}
        onSearch={(search) => onChange({ search }, { replace: true })}
      />

      <ChipGroup
        legend={t('leads.filterStatus')}
        options={LeadStatus.options}
        selected={query.status}
        label={(s) => t(`leadStatus.${s}`)}
        onChange={(status) => onChange({ status })}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor={cityId} className="text-sm font-medium">
          {t('leads.filterCity')}
        </label>
        <Select
          id={cityId}
          value={query.city ?? ''}
          onChange={(e) => onChange({ city: (e.target.value || undefined) as LeadQuery['city'] })}
          className="md:min-w-44"
        >
          <option value="">{t('leads.anyCity')}</option>
          {City.options.map((c) => (
            <option key={c} value={c}>
              {t(`city.${c}`)}
            </option>
          ))}
        </Select>
      </div>

      {hasFilters && (
        <Button variant="ghost" onClick={() => onChange({ status: [], city: undefined, search: undefined })}>
          {t('common.clearFilters')}
        </Button>
      )}
    </div>
  )
}
