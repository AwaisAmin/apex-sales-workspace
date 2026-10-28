import { useEffect } from 'react'
import { keepPreviousData, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { Paginated } from '@/api/schemas'
import type { Locale } from '@/i18n/config'
import { useLocale } from '@/i18n/useLocale'

interface PagedQueryOptions<Q extends { page: number; pageSize: number }, T> {
  query: Q
  key: (q: Q, locale: Locale) => QueryKey
  fetch: (q: Q, locale: Locale, signal: AbortSignal) => Promise<Paginated<T>>
}

/**
 * Shared list-fetching behaviour:
 *  - keepPreviousData: the current page stays visible while the next loads (no skeleton flash, no layout shift)
 *  - prefetch of the next page so "Next" feels instant
 *  - locale in the key, because server-side sorting by name is language-dependent
 */
export function usePagedQuery<Q extends { page: number; pageSize: number }, T>({
  query,
  key,
  fetch,
}: PagedQueryOptions<Q, T>) {
  const { locale } = useLocale()
  const client = useQueryClient()

  const result = useQuery({
    queryKey: key(query, locale),
    queryFn: ({ signal }) => fetch(query, locale, signal),
    placeholderData: keepPreviousData,
  })

  const total = result.data?.total ?? 0
  useEffect(() => {
    if (query.page * query.pageSize >= total) return
    const next = { ...query, page: query.page + 1 }
    void client.prefetchQuery({
      queryKey: key(next, locale),
      queryFn: ({ signal }) => fetch(next, locale, signal),
    })
  }, [client, query, locale, total, key, fetch])

  return result
}
