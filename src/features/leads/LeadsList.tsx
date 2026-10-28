import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Lead, LeadQuery, LeadSortField } from '@/api/schemas'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLocale } from '@/i18n/useLocale'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, formatNumber, formatRelative } from '@/lib/format'
import { LeadStatusBadge } from './LeadStatusBadge'

interface LeadsListProps {
  leads: Lead[] | undefined
  query: LeadQuery
  selectedId: string | null
  onSort: (sort: LeadSortField, dir: 'asc' | 'desc') => void
  onSelect: (id: string) => void
}

/** Opens the lead in the side panel; still a real link, so Ctrl/âŒ˜-click or "open in new tab" work. */
function LeadLink({ lead, onSelect, className }: { lead: Lead; onSelect: (id: string) => void; className?: string }) {
  const { locale } = useLocale()
  const href = `?lead=${lead.id}`
  const handle = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onSelect(lead.id)
  }
  return (
    <a href={href} onClick={handle} className={cn('font-medium text-fg hover:underline', className)}>
      {lead.company[locale]}
    </a>
  )
}

/**
 * One data set, two layouts: a semantic <table> from md up, stacked cards on
 * small screens (a 7-column table is unusable at 360px even with scrolling).
 */
export function LeadsList({ leads, query, selectedId, onSort, onSelect }: LeadsListProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const col = (k: keyof typeof cols) => cols[k]
  const cols = {
    company: t('leads.columns.company'),
    status: t('leads.columns.status'),
    city: t('leads.columns.city'),
    score: t('leads.columns.score'),
    estimatedValue: t('leads.columns.estimatedValue'),
    createdAt: t('leads.columns.createdAt'),
    lastContactedAt: t('leads.columns.lastContactedAt'),
  }
  const sortProps = { sort: query.sort, dir: query.dir, onSort }
  const rowClick = (e: MouseEvent, id: string) => {
    // Let the link handle its own clicks (incl. Ctrl/âŒ˜-click), and don't hijack text selection.
    if ((e.target as HTMLElement).closest('a, button') || window.getSelection()?.toString()) return
    onSelect(id)
  }
  const skeletonRows = Array.from({ length: Math.min(query.pageSize, 10) }, (_, i) => i)

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t('leads.title')}</caption>
          <thead className="border-b border-border bg-surface-muted/60">
            <tr>
              <SortableHeader field="company" label={col('company')} {...sortProps} />
              <th scope="col" className="px-3 py-2 text-start font-medium text-fg-muted">
                {col('status')}
              </th>
              <th scope="col" className="px-3 py-2 text-start font-medium text-fg-muted">
                {col('city')}
              </th>
              <SortableHeader field="score" label={col('score')} align="end" {...sortProps} />
              <SortableHeader field="estimatedValue" label={col('estimatedValue')} align="end" {...sortProps} />
              <SortableHeader field="createdAt" label={col('createdAt')} {...sortProps} />
              <SortableHeader field="lastContactedAt" label={col('lastContactedAt')} {...sortProps} />
            </tr>
          </thead>
          <tbody>
            {leads
              ? leads.map((lead) => (
                  <tr
                    key={lead.id}
                    aria-current={lead.id === selectedId ? 'true' : undefined}
                    // Mouse convenience: the whole row opens the lead. Keyboard/screen-reader users use the
                    // company link, so the row itself is not a second tab stop.
                    onClick={(e) => rowClick(e, lead.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/50 aria-current:bg-primary/10"
                  >
                    <td className="px-3 py-2.5">
                      <LeadLink lead={lead} onSelect={onSelect} />
                      <div className="text-xs text-fg-muted">{lead.contactName[locale]}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-2.5">{t(`city.${lead.city}`)}</td>
                    <td className="tabular px-3 py-2.5 text-end">{formatNumber(lead.score, locale)}</td>
                    <td className="tabular px-3 py-2.5 text-end">{formatCurrency(lead.estimatedValue, locale)}</td>
                    <td className="tabular px-3 py-2.5">{formatDate(lead.createdAt, locale)}</td>
                    <td className="px-3 py-2.5 text-fg-muted">
                      {lead.lastContactedAt ? formatRelative(lead.lastContactedAt, locale) : t('common.never')}
                    </td>
                  </tr>
                ))
              : skeletonRows.map((i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }, (_, c) => (
                      <td key={c} className="px-3 py-3.5">
                        <Skeleton className="h-4 w-full max-w-28" />
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-border md:hidden">
        {leads
          ? leads.map((lead) => (
              <li
                key={lead.id}
                aria-current={lead.id === selectedId ? 'true' : undefined}
                onClick={(e) => rowClick(e, lead.id)}
                className="flex cursor-pointer flex-col gap-1.5 p-4 active:bg-surface-muted aria-current:bg-primary/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <LeadLink lead={lead} onSelect={onSelect} />
                  <LeadStatusBadge status={lead.status} />
                </div>
                <p className="text-sm text-fg-muted">
                  {lead.contactName[locale]} Â· {t(`city.${lead.city}`)}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 text-sm">
                  <dt className="text-fg-muted">{col('estimatedValue')}</dt>
                  <dd className="tabular text-end">{formatCurrency(lead.estimatedValue, locale)}</dd>
                  <dt className="text-fg-muted">{col('score')}</dt>
                  <dd className="tabular text-end">{formatNumber(lead.score, locale)}</dd>
                  <dt className="text-fg-muted">{col('lastContactedAt')}</dt>
                  <dd className="text-end">
                    {lead.lastContactedAt ? formatRelative(lead.lastContactedAt, locale) : t('common.never')}
                  </dd>
                </dl>
              </li>
            ))
          : skeletonRows.slice(0, 5).map((i) => (
              <li key={i} className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </li>
            ))}
      </ul>
    </>
  )
}
