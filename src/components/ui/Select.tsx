import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Chevron } from './icons'

const SIZES = {
  sm: 'h-8 text-sm',
  md: 'h-10',
} as const

interface SelectProps extends Omit<ComponentProps<'select'>, 'size'> {
  size?: keyof typeof SIZES
}

/**
 * Native <select> (free keyboard, screen-reader and mobile picker support) with the
 * browser arrow replaced by our own chevron. The chevron sits at the inline *end*
 * and the text reserves space for it, so it never touches the edge in LTR or RTL.
 */
export function Select({ size = 'md', className, children, ...props }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          // border-strong: a form control's boundary must reach 3:1 (WCAG 1.4.11).
          'w-full appearance-none rounded-md border border-border-strong bg-surface ps-3 pe-9 text-fg',
          'cursor-pointer hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60',
          SIZES[size],
        )}
        {...props}
      >
        {children}
      </select>
      <Chevron
        direction="down"
        className="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-fg-muted"
      />
    </div>
  )
}
