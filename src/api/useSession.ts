import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './endpoints'
import { qk } from './queryKeys'
import { session } from './session'

export function useSession() {
  return useSyncExternalStore(session.subscribe, session.get)
}

/** The signed-in user (with role). Keyed by user id, so switching roles refetches. */
export function useCurrentUser() {
  const { userId } = useSession()
  return useQuery({
    queryKey: qk.me(userId),
    queryFn: ({ signal }) => api.me(signal),
    enabled: userId !== null,
    staleTime: Infinity,
  })
}
