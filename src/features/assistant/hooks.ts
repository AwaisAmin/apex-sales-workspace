import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { qk } from '@/api/queryKeys'
import type { AiSuggestion, Lead, Opportunity } from '@/api/schemas'

type Target = AiSuggestion['targetType']

export function useSuggestions(targetType: Target, targetId: string) {
  return useQuery({
    queryKey: qk.suggestions.for(targetType, targetId),
    queryFn: ({ signal }) => api.suggestions(targetType, targetId, signal),
  })
}

/** Translate an approved suggestion into the one write it is allowed to make. */
function applyChange(s: AiSuggestion, version: number): Promise<Lead | Opportunity> {
  const base = { version, suggestionId: s.id }
  switch (s.change.field) {
    case 'leadStatus':
      return api.updateLeadStatus(s.targetId, { ...base, status: s.change.to })
    case 'opportunityStage':
      return api.updateOpportunity(s.targetId, { ...base, stage: s.change.to })
    case 'nextStep':
      return api.updateOpportunity(s.targetId, { ...base, nextStep: s.change.to })
  }
}

/**
 * Applies a suggestion the user has explicitly approved.
 *
 * Pessimistic on purpose: an AI-originated change is shown as applied only once
 * the server has accepted it (version check, role check, validation), never
 * optimistically. The server rejects a stale suggestion with 409.
 */
export function useApplySuggestion() {
  const client = useQueryClient()
  const refresh = (s: AiSuggestion) =>
    Promise.all([
      client.invalidateQueries({ queryKey: s.targetType === 'lead' ? qk.leads.all : qk.opportunities.all }),
      client.invalidateQueries({ queryKey: qk.suggestions.for(s.targetType, s.targetId) }),
      client.invalidateQueries({ queryKey: qk.audit }),
    ])

  return useMutation({
    mutationFn: ({ suggestion, version }: { suggestion: AiSuggestion; version: number }) =>
      applyChange(suggestion, version),
    // Returned (awaited) on purpose: the approval dialog closes only once the drawer already shows the
    // server-confirmed record, so the user never sees a half-updated state for an AI-originated change.
    onSuccess: (_data, { suggestion }) => refresh(suggestion),
    onError: (error, { suggestion }) => {
      // Stale or vanished suggestion: refetch so the UI shows the current record and drops the suggestion.
      if (isApiError(error) && (error.code === 'CONFLICT' || error.code === 'NOT_FOUND')) void refresh(suggestion)
    },
  })
}

export function useDismissSuggestion() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (s: AiSuggestion) => api.dismissSuggestion(s.id),
    onSuccess: (_d, s) =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.suggestions.for(s.targetType, s.targetId) }),
        client.invalidateQueries({ queryKey: qk.audit }),
      ]),
  })
}

export function useAudit() {
  return useQuery({ queryKey: qk.audit, queryFn: ({ signal }) => api.audit(signal) })
}
