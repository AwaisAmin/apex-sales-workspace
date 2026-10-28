import { cn } from '@/lib/cn'

/** Inline SVG icons (no icon-font/library download). All decorative: labels live on the parent control. */

/** Logical direction: `start`/`end` flip automatically in RTL via the rtl: variant. */
export function Chevron({ direction, className }: { direction: 'start' | 'end' | 'up' | 'down'; className?: string }) {
  const rotate = {
    start: 'rotate-180 rtl:rotate-0',
    end: 'rtl:rotate-180',
    up: '-rotate-90',
    down: 'rotate-90',
  }[direction]
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn('size-4', rotate, className)}>
      <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0">
      <path d="M6 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeOpacity={dir === 'asc' ? 1 : 0.3} />
      <path d="M6 12l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeOpacity={dir === 'desc' ? 1 : 0.3} />
    </svg>
  )
}

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn('size-4', className)}>
      <path d="M10 2l1.8 4.7L16.5 8.5l-4.7 1.8L10 15l-1.8-4.7L3.5 8.5l4.7-1.8z" fill="currentColor" />
    </svg>
  )
}
