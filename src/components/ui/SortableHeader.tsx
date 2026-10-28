import { cn } from '@/lib/cn'
import { SortIcon } from './icons'

interface SortableHeaderProps<F extends string> {
  field: F
  label: string
  sort: F
  dir: 'asc' | 'desc'
  onSort: (field: F, dir: 'asc' | 'desc') => void
  align?: 'start' | 'end'
}

/**
 * Column header with a real <button> (keyboard + screen reader operable) and
 * aria-sort on the <th>, which is how assistive tech announces the current sort.
 */
export function SortableHeader<F extends string>({
  field,
  label,
  sort,
  dir,
  onSort,
  align = 'start',
}: SortableHeaderProps<F>) {
  const active = sort === field
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
  // First click on a new column: numbers/dates are most useful descending.
  const nextDir = active ? (dir === 'asc' ? 'desc' : 'asc') : 'desc'

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn('px-3 py-2 font-medium', align === 'end' ? 'text-end' : 'text-start')}
    >
      <button
        type="button"
        onClick={() => onSort(field, nextDir)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm hover:text-fg',
          align === 'end' && 'flex-row-reverse',
          active ? 'text-fg' : 'text-fg-muted',
        )}
      >
        {label}
        <SortIcon dir={active ? dir : null} />
      </button>
    </th>
  )
}
