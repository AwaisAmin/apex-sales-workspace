/*
 * Toast messages + modal layer stack (framework-free, so mutation callbacks can call toast()).
 *
 * A modal <dialog> makes everything outside it inert, and screen readers do not announce
 * live regions inside inert content — so a toast fired from inside a drawer would be silent
 * (and could sit behind the top layer). Each open dialog therefore mounts its own
 * <Toaster layer={dialogId} /> outlet, and only the outlet of the topmost modal renders
 * messages. The stack follows showModal() order — the browser's top-layer order — not React
 * mount order (child-first, which would misorder a drawer that is open on page load).
 * The app shell mounts the base outlet (no layer), used when no modal is open.
 */

export type ToastTone = 'success' | 'danger' | 'info'
export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

let items: ToastItem[] = []
let modalStack: string[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Fire-and-forget notification; callable from mutation callbacks outside React. */
export function toast(message: string, tone: ToastTone = 'success', durationMs = 5000) {
  const id = ++seq
  items = [...items, { id, message, tone }]
  emit()
  setTimeout(() => {
    items = items.filter((i) => i.id !== id)
    emit()
  }, durationMs)
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getToasts = () => items
export const getTopLayer = () => modalStack.at(-1) ?? null

/** Mirrors "any modal open" onto <html data-modal-open> (used for the page scroll lock in index.css). */
function syncModalAttribute() {
  if (modalStack.length > 0) document.documentElement.dataset.modalOpen = ''
  else delete document.documentElement.dataset.modalOpen
}

/** Called by Dialog right after showModal() / on close, keeping the stack in top-layer order. */
export function pushModalLayer(id: string) {
  modalStack = [...modalStack.filter((m) => m !== id), id]
  syncModalAttribute()
  emit()
}

export function popModalLayer(id: string) {
  if (!modalStack.includes(id)) return
  modalStack = modalStack.filter((m) => m !== id)
  syncModalAttribute()
  emit()
}

/** Test isolation: module-level state would otherwise leak toasts/layers between tests. */
export function resetToastsForTests() {
  items = []
  modalStack = []
  syncModalAttribute()
  emit()
}
