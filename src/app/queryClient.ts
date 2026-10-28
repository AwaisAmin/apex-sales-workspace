import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'
import { session } from '@/api/session'

export const MAX_READ_RETRIES = 3

/** Exponential backoff with full jitter (avoids synchronized retry storms), capped at 8s. */
export function backoffDelay(attempt: number, error: unknown): number {
  if (isApiError(error) && error.retryAfterMs) return error.retryAfterMs // server knows best
  const cap = Math.min(8000, 500 * 2 ** attempt)
  return Math.random() * cap
}

/**
 * Retry policy:
 *  - Reads: retry transient failures (network, 5xx, 429) up to 3 times with backoff.
 *    Never retry 4xx — they are deterministic and the user needs to see them now.
 *  - Writes: never auto-retry. A PATCH that timed out may have succeeded; repeating
 *    it silently could apply a change twice. The user retries explicitly.
 *  - 401 anywhere: flag the session as expired so the UI can prompt re-authentication.
 */
export function createQueryClient() {
  const on401 = (error: unknown) => {
    if (isApiError(error) && error.code === 'UNAUTHORIZED') session.markExpired()
  }

  return new QueryClient({
    queryCache: new QueryCache({ onError: on401 }),
    mutationCache: new MutationCache({ onError: on401 }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => isApiError(error) && error.isTransient && failureCount < MAX_READ_RETRIES,
        retryDelay: backoffDelay,
        // Lists are re-fetched on focus anyway; 30s avoids refetch on every tab switch inside the app.
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}
