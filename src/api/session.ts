/*
 * Simulated authentication. A real app would hold an httpOnly session cookie or
 * short-lived token; here the "session" is just which synthetic user is active,
 * so reviewers can switch roles (rep / manager / read-only viewer) live.
 */

/** Header carrying the simulated session; read by the mock backend. */
export const SESSION_HEADER = 'x-apex-user'

export type SessionState = { userId: string | null; expired: boolean }

const STORAGE_KEY = 'apex.session'
export const DEFAULT_USER_ID = 'u-rep'

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_USER_ID
  } catch {
    return DEFAULT_USER_ID
  }
}

let state: SessionState = { userId: read(), expired: false }
const listeners = new Set<() => void>()

function emit(next: SessionState) {
  state = next
  listeners.forEach((l) => l())
}

export const session = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  signIn(userId: string) {
    try {
      localStorage.setItem(STORAGE_KEY, userId)
    } catch {
      /* ignore */
    }
    emit({ userId, expired: false })
  },
  /** Called by the query layer on any 401: the UI shows a re-authentication prompt. */
  markExpired() {
    if (!state.expired) emit({ ...state, expired: true })
  },
}
