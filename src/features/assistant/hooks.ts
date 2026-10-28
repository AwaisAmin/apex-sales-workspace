import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { qk } from '@/api/queryKeys'
import type { AiSuggestion, Lead, Opportunity } from '@/api/schemas'

type Target = AiSuggestion['targetType']

export function useSuggestions(targetType: Target, targetId: string, enabled = true) {
  return useQuery({
    queryKey: qk.suggestions.for(targetType, targetId),
    queryFn: ({ signal }) => api.suggestions(targetType, targetId, signal),
    enabled,
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
 *
 * On success the server-confirmed record is written to the cache immediately and the
 * consumed suggestion removed, so the drawer never shows a half-updated state.
 * `onApplied` runs here (hook level) rather than as a `mutate(…, { onSuccess })` callback:
 * removing the suggestion unmounts the card that started the mutation, and TanStack Query
 * skips per-call callbacks for unmounted observers — which made the confirmation toast
 * appear only sometimes.
 */
export function useApplySuggestion({ onApplied }: { onApplied?: () => void } = {}) {
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
    onSuccess: (confirmed, { suggestion: s }) => {
      onApplied?.()
      client.setQueryData(
        s.targetType === 'lead' ? qk.leads.detail(s.targetId) : qk.opportunities.detail(s.targetId),
        confirmed,
      )
      client.setQueryData<AiSuggestion[]>(qk.suggestions.for(s.targetType, s.targetId), (old) =>
        old?.filter((x) => x.id !== s.id),
      )
      void refresh(s) // lists and audit catch up in the background
    },
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
