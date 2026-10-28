import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

const VARIANTS = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-fg hover:bg-surface-muted',
  danger: 'bg-danger text-danger-fg hover:opacity-90',
  ai: 'bg-ai text-ai-fg hover:opacity-90',
} as const

const SIZES = {
  sm: 'h-8 px-2.5 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
} as const

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  /** Shows a spinner and blocks clicks, but stays focusable so screen readers keep their place. */
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const inactive = disabled || loading
  return (
    <button
      type={type}
      // aria-disabled instead of disabled keeps the button in the tab order with its label announced.
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      onClick={inactive ? (e) => e.preventDefault() : onClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap',
        'transition-colors duration-(--duration-fast)',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}
