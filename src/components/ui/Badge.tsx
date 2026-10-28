import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TONES = {
  neutral: 'bg-surface-muted text-fg-muted',
  info: 'bg-info-bg text-info',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  ai: 'bg-ai-bg text-ai',
} as const

export type BadgeTone = keyof typeof TONES

/** Status is always conveyed by text, never by color alone. */
export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
