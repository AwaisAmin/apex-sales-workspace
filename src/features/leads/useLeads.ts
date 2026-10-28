import { api } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { LeadQuery } from '@/api/schemas'
import { usePagedQuery } from '@/lib/usePagedQuery'

export function useLeads(query: LeadQuery) {
  return usePagedQuery({ query, key: qk.leads.list, fetch: api.listLeads })
}
