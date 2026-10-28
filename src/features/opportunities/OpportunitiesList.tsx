import { useTranslation } from 'react-i18next'
import type { Opportunity, OpportunityQuery, OpportunitySortField } from '@/api/schemas'
import { Badge } from '@/components/ui/Badge'
import { RecordLink, rowClickHandler } from '@/components/ui/RecordLink'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLocale } from '@/i18n/useLocale'
import { formatCurrency, formatDate, formatPercent, formatRelative } from '@/lib/format'
import { isOverdue, weightedValue } from './opportunity'
import { StageBadge } from './StageBadge'

interface OpportunitiesListProps {
  items: Opportunity[] | undefined
  query: OpportunityQuery
  selectedId: string | null
  onSort: (sort: OpportunitySortField, dir: 'asc' | 'desc') => void
  onSelect: (id: string) => void
}

export function OpportunitiesList({ items, query, selectedId, onSort, onSelect }: OpportunitiesListProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const c = (k: keyof typeof cols) => cols[k]
  const cols = {
    title: t('opportunities.columns.title'),
    stage: t('opportunities.columns.stage'),
    amount: t('opportunities.columns.amount'),
    probability: t('opportunities.columns.probability'),
    weighted: t('opportunities.columns.weighted'),
    expectedCloseDate: t('opportunities.columns.expectedCloseDate'),
    nextStep: t('opportunities.columns.nextStep'),
    updatedAt: t('opportunities.columns.updatedAt'),
  }
  const sortProps = { sort: query.sort, dir: query.dir, onSort }
  const skeletonRows = Array.from({ length: Math.min(query.pageSize, 10) }, (_, i) => i)

  const link = (o: Opportunity) => (
    <RecordLink href={`?opp=${o.id}`} onSelect={() => onSelect(o.id)}>
      {o.title[locale]}
    </RecordLink>
  )
  const closeDate = (o: Opportunity) => (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="tabular">{formatDate(o.expectedCloseDate, locale)}</span>
      {isOverdue(o) && <Badge tone="danger">{t('opportunities.overdue')}</Badge>}
    </span>
  )
  const nextStep = (o: Opportunity) =>
    o.nextStep ? o.nextStep[locale] : <span className="text-fg-muted italic">{t('opportunities.noNextStep')}</span>

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t('opportunities.title')}</caption>
          <thead className="border-b border-border bg-surface-muted/60">
            <tr>
              <th scope="col" className="px-3 py-2 text-start font-medium text-fg-muted">
                {c('title')}
              </th>
              <th scope="col" className="px-3 py-2 text-start font-medium text-fg-muted">
                {c('stage')}
              </th>
              <SortableHeader field="amount" label={c('amount')} align="end" {...sortProps} />
              <SortableHeader field="probability" label={c('probability')} align="end" {...sortProps} />
              <th scope="col" className="px-3 py-2 text-end font-medium text-fg-muted">
                {c('weighted')}
              </th>
              <SortableHeader field="expectedCloseDate" label={c('expectedCloseDate')} {...sortProps} />
              <th scope="col" className="px-3 py-2 text-start font-medium text-fg-muted">
                {c('nextStep')}
              </th>
              <SortableHeader field="updatedAt" label={c('updatedAt')} {...sortProps} />
            </tr>
          </thead>
          <tbody>
            {items
              ? items.map((o) => (
                  <tr
                    key={o.id}
                    aria-current={o.id === selectedId ? 'true' : undefined}
                    onClick={rowClickHandler(() => onSelect(o.id))}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/50 aria-current:bg-primary/10"
                  >
                    <td className="px-3 py-2.5">{link(o)}</td>
                    <td className="px-3 py-2.5">
                      <StageBadge stage={o.stage} />
                    </td>
                    <td className="tabular px-3 py-2.5 text-end">{formatCurrency(o.amount, locale)}</td>
                    <td className="tabular px-3 py-2.5 text-end">{formatPercent(o.probability, locale)}</td>
                    <td className="tabular px-3 py-2.5 text-end font-medium">
                      {formatCurrency(weightedValue(o), locale)}
                    </td>
                    <td className="px-3 py-2.5">{closeDate(o)}</td>
                    <td className="max-w-56 px-3 py-2.5">{nextStep(o)}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{formatRelative(o.updatedAt, locale)}</td>
                  </tr>
                ))
              : skeletonRows.map((i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }, (_, col) => (
                      <td key={col} className="px-3 py-3.5">
                        <Skeleton className="h-4 w-full max-w-28" />
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {items
          ? items.map((o) => (
              <li
                key={o.id}
                aria-current={o.id === selectedId ? 'true' : undefined}
                onClick={rowClickHandler(() => onSelect(o.id))}
                className="flex cursor-pointer flex-col gap-1.5 p-4 active:bg-surface-muted aria-current:bg-primary/10"
              >
                <div className="flex items-start justify-between gap-2">
                  {link(o)}
                  <StageBadge stage={o.stage} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                  <dt className="text-fg-muted">{c('amount')}</dt>
                  <dd className="tabular text-end">{formatCurrency(o.amount, locale)}</dd>
                  <dt className="text-fg-muted">{c('weighted')}</dt>
                  <dd className="tabular text-end">
                    {formatCurrency(weightedValue(o), locale)} ({formatPercent(o.probability, locale)})
                  </dd>
                  <dt className="text-fg-muted">{c('expectedCloseDate')}</dt>
                  <dd className="text-end">{closeDate(o)}</dd>
                </dl>
                <p className="text-sm">{nextStep(o)}</p>
              </li>
            ))
          : skeletonRows.slice(0, 5).map((i) => (
              <li key={i} className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </li>
            ))}
      </ul>
    </>
  )
}
