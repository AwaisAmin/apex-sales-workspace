import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** id of the element that names the dialog */
  labelledBy: string
  describedBy?: string
  variant: 'drawer' | 'center'
  /** Element to focus on open (defaults to the browser's first focusable). */
  initialFocus?: RefObject<HTMLElement | null>
  /** When false, Escape and backdrop clicks are ignored (e.g. while a write is in flight). */
  dismissible?: boolean
  className?: string
  children: ReactNode
}

/**
 * Native <dialog> opened with showModal(): the browser provides the focus trap,
 * inert background, Escape handling, top-layer stacking (so a confirm dialog
 * can sit above a drawer) and focus return to the opener on close.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  variant,
  initialFocus,
  dismissible = true,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      initialFocus?.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initialFocus])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // React propagates synthetic cancel/close events to *ancestor* components, so a confirm dialog
      // nested inside a drawer would also close the drawer. Only react to events from this dialog.
      // Escape fires `cancel`; block it while not dismissible, otherwise let `close` run.
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return
        if (!dismissible) e.preventDefault()
      }}
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      // A click whose target is the <dialog> itself landed on the backdrop.
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) e.currentTarget.close()
      }}
      className={cn(
        'bg-surface text-fg shadow-xl backdrop:bg-black/50',
        variant === 'drawer' &&
          // Pinned to the inline end: right in LTR, left in RTL.
          'm-0 ms-auto h-dvh max-h-dvh w-full max-w-xl border-s border-border',
        // m-auto restores the UA centering that Tailwind's preflight (margin: 0) removes.
        variant === 'center' && 'm-auto w-[min(34rem,calc(100%-2rem))] rounded-lg border border-border',
        className,
      )}
    >
      {open && children}
    </dialog>
  )
}

export function DialogCloseButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.close')}
      className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}
