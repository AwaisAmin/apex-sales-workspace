import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const isModifiedClick = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0

/**
 * Opens a record in the side panel via `onSelect`, but is still a real link:
 * Ctrl/⌘-click and "open in new tab" keep working, and it is the row's single tab stop.
 */
export function RecordLink({
  href,
  onSelect,
  className,
  children,
}: {
  href: string
  onSelect: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (isModifiedClick(e)) return
        e.preventDefault()
        onSelect()
      }}
      className={cn('font-medium text-fg hover:underline', className)}
    >
      {children}
    </a>
  )
}
