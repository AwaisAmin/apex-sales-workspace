import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Toaster } from './Toast'
import { popModalLayer, pushModalLayer } from './toast-store'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** id of the element that names the dialog */
  labelledBy: string
  describedBy?: string
  variant: 'drawer' | 'center'
  /** Element to focus on open (defaults to the browser's first focusable). */
  initialFocus?: RefObject<HTMLElement | null>
  /** Element to focus after closing, when the opener should not get focus back (e.g. it was removed). */
  returnFocus?: RefObject<HTMLElement | null>
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
  returnFocus,
  dismissible = true,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const layerId = useId()
  const openerRef = useRef<Element | null>(null)
  // Mirrors the *browser's* open state. Escape closes the native dialog before React hears about it;
  // if the user re-opens immediately (Escape then Enter), React batches open: true→false→true into
  // "no change" and the effect below would never re-run — leaving the dialog shut while React thinks
  // it is open, and the trigger button dead. Tracking the native state makes that desync re-trigger the sync.
  const [nativeOpen, setNativeOpen] = useState(false)
  /** True from showModal() until focus has been restored after close (see the restore effect below). */
  const pendingRestore = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      openerRef.current = document.activeElement
      dialog.showModal()
      // Set with showModal() itself (not on `open` changes): a batched close→reopen keeps `open` true.
      pendingRestore.current = true
      pushModalLayer(layerId)
      setNativeOpen(true)
      initialFocus?.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, nativeOpen, initialFocus, layerId])

  // The browser returns focus to the opener on close — but if the opener was removed meanwhile
  // (e.g. the approved lead no longer matches the list filter), focus falls to <body> and a
  // keyboard user loses their place. Then focus `returnFocus`, or the main landmark.
  // The same applies when the dialog itself is unmounted while open (its trigger's card vanished):
  // no `close` event fires in that case, so the cleanup handles it.
  //
  // Note: dialog.close() clears `open` synchronously but fires `close` in a later task. If React
  // unmounts the dialog in between, the listener is gone before the event arrives — so "still owes a
  // focus restore" is tracked in `pendingRestore` rather than read from `dialog.open`.
  const returnFocusRef = useRef(returnFocus)
  useEffect(() => {
    returnFocusRef.current = returnFocus
  })
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const restore = () => {
      if (!pendingRestore.current) return
      pendingRestore.current = false
      popModalLayer(layerId)
      requestAnimationFrame(() => {
        const explicit = returnFocusRef.current?.current
        if (explicit?.isConnected) return explicit.focus()
        const lost = document.activeElement === null || document.activeElement === document.body
        if (lost && !openerRef.current?.isConnected) document.getElementById('main')?.focus()
      })
    }
    dialog.addEventListener('close', restore)
    return () => {
      dialog.removeEventListener('close', restore)
      restore()
    }
  }, [layerId])

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
        if (e.target !== e.currentTarget) return
        setNativeOpen(false)
        onClose()
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
      {open && (
        <>
          {children}
          {/* Toasts raised while this dialog is open must live inside it to be seen and announced. */}
          <Toaster layer={layerId} />
        </>
      )}
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
