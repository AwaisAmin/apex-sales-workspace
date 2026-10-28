import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { SortDir } from '@/api/schemas'
import { Select } from './Select'

interface MobileSortProps<F extends string> {
  fields: readonly F[]
  sort: F
  dir: SortDir
  label: (field: F) => string
  onChange: (sort: F, dir: SortDir) => void
}

/** Sort control for small screens, where column headers are hidden. */
export function MobileSort<F extends string>({ fields, sort, dir, label, onChange }: MobileSortProps<F>) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex items-center gap-2 md:hidden">
      <label htmlFor={id} className="text-sm text-fg-muted">
        {t('sort.label')}
      </label>
      <Select
        id={id}
        size="sm"
        value={`${sort}:${dir}`}
        onChange={(e) => {
          const [f, d] = e.target.value.split(':') as [F, SortDir]
          onChange(f, d)
        }}
        className="flex-1"
      >
        {fields.flatMap((f) =>
          (['desc', 'asc'] as const).map((d) => (
            <option key={`${f}:${d}`} value={`${f}:${d}`}>
              {label(f)} · {t(d === 'asc' ? 'sort.ascending' : 'sort.descending')}
            </option>
          )),
        )}
      </Select>
    </div>
  )
}
