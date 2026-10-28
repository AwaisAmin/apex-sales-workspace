import { useSyncExternalStore } from 'react'

/*
 * Minimal History-API router. The app has two top-level views, so a full router
 * library (~20 kB) buys little; this keeps URL state (filters, sort, page,
 * selected record) shareable and back/forward-friendly.
 * Trade-off: no nested routes/loaders — revisit if the route count grows.
 */

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

const snapshot = () => window.location.pathname + window.location.search

export function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot)
  const url = new URL(href, window.location.origin)
  return { pathname: url.pathname, search: url.search }
}

/** `replace` for high-frequency updates (typing in search) so Back isn't flooded with history entries. */
export function navigate(to: string, { replace = false } = {}) {
  if (to === snapshot()) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
  emit()
}

export const ROUTES = { leads: '/leads', opportunities: '/opportunities' } as const
