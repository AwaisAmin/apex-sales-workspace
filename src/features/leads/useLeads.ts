import { useEffect } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { LeadQuery } from '@/api/schemas'
import { useLocale } from '@/i18n/useLocale'

export function useLeads(query: LeadQuery) {
  const { locale } = useLocale()
  const client = useQueryClient()

  const result = useQuery({
    queryKey: qk.leads.list(query, locale),
    queryFn: ({ signal }) => api.listLeads(query, locale, signal),
    // Keep showing the current page while the next one loads: no layout jump or
    // flash of skeletons on every sort/page click. `isPlaceholderData` drives a subtle "updating" hint.
    placeholderData: keepPreviousData,
  })

  // Prefetch the next page so "Next" feels instant.
  const total = result.data?.total ?? 0
  useEffect(() => {
    if (query.page * query.pageSize >= total) return
    const next = { ...query, page: query.page + 1 }
    void client.prefetchQuery({
      queryKey: qk.leads.list(next, locale),
      queryFn: ({ signal }) => api.listLeads(next, locale, signal),
    })
  }, [client, query, locale, total])

  return result
}
