import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'danger' | 'info'
interface ToastItem {
  id: number
  message: string
  tone: Tone
}

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Fire-and-forget notification; callable from mutation callbacks outside React. */
export function toast(message: string, tone: Tone = 'success', durationMs = 5000) {
  const id = ++seq
  items = [...items, { id, message, tone }]
  emit()
  setTimeout(() => {
    items = items.filter((i) => i.id !== id)
    emit()
  }, durationMs)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/**
 * Mounted once in the shell. The live region is always in the DOM so screen
 * readers announce each new message (they ignore regions inserted with content).
 */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items)
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <p
          key={t.id}
          className={cn(
            'pointer-events-auto max-w-md rounded-md px-4 py-2.5 text-sm font-medium shadow-card',
            t.tone === 'success' && 'bg-success text-white dark:text-black',
            t.tone === 'danger' && 'bg-danger text-white dark:text-black',
            t.tone === 'info' && 'bg-fg text-bg',
          )}
        >
          {t.message}
        </p>
      ))}
    </div>
  )
}
