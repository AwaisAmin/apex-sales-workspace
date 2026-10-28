import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/useLocale'
import { formatNumber } from '@/lib/format'
import { Button } from './Button'
import { Chevron } from './icons'

const PAGE_SIZES = [10, 20, 50] as const

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const sizeId = useId()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const n = (v: number) => formatNumber(v, locale)

  return (
    <nav aria-label={t('pagination.label')} className="flex flex-wrap items-center justify-between gap-3 text-sm">
      {/* Announced politely when the page changes */}
      <p aria-live="polite" className="tabular text-fg-muted">
        {t('pagination.showing', { from: n(from), to: n(to), total: n(total) })}
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor={sizeId} className="text-fg-muted">
          {t('pagination.perPage')}
        </label>
        <select
          id={sizeId}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-md border border-border bg-surface px-2"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {n(s)}
            </option>
          ))}
        </select>
        <span className="tabular">{t('pagination.pageOf', { page: n(page), pages: n(pages) })}</span>
        <div className="flex gap-1">
          <Button size="sm" aria-label={t('pagination.previous')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            {/* "Previous" points to the inline start: left in LTR, right in RTL */}
            <Chevron direction="start" />
          </Button>
          <Button size="sm" aria-label={t('pagination.next')} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            <Chevron direction="end" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
