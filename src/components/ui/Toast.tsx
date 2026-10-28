import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/cn'
import { getToasts, getTopLayer, subscribeToasts } from './toast-store'

/** Toast outlet. `layer` is the id of the dialog it lives in (none = app shell). See toast-store.ts. */
export function Toaster({ layer = null }: { layer?: string | null }) {
  const list = useSyncExternalStore(subscribeToasts, getToasts)
  const isTop = useSyncExternalStore(subscribeToasts, () => getTopLayer() === layer)

  return (
    // The live region is always in the DOM so it is registered before any message arrives.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-60 flex flex-col items-center gap-2 px-4"
    >
      {isTop &&
        list.map((t) => (
          <p
            key={t.id}
            className={cn(
              'pointer-events-auto max-w-md rounded-md px-4 py-2.5 text-sm font-medium shadow-card',
              t.tone === 'success' && 'bg-success text-success-fg',
              t.tone === 'danger' && 'bg-danger text-danger-fg',
              t.tone === 'info' && 'bg-fg text-bg',
            )}
          >
            {t.message}
          </p>
        ))}
    </div>
  )
}
