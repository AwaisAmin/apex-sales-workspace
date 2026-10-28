import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { Lead, LeadStatus, Paginated } from '@/api/schemas'

interface Variables {
  lead: Lead
  status: LeadStatus
}

interface Snapshot {
  detail: Lead | undefined
  lists: [QueryKey, Paginated<Lead> | undefined][]
}

/**
 * Manual status change — OPTIMISTIC with rollback.
 *
 * Why optimistic here (but pessimistic for AI suggestions): the user made this
 * decision themselves, the change is small and fully reversible, and instant
 * feedback matters for a frequent action. If the server rejects it (403, 409,
 * 422, 5xx) every cache we touched is restored from the snapshot, and the user
 * is told exactly what happened.
 *
 * The version is NOT bumped optimistically: the server owns versioning, and the
 * confirmed record (with its new version) replaces the optimistic one on success.
 */
export function useUpdateLeadStatus() {
  const client = useQueryClient()

  return useMutation<Lead, Error, Variables, Snapshot>({
    mutationFn: ({ lead, status }) => api.updateLeadStatus(lead.id, { status, version: lead.version }),

    onMutate: async ({ lead, status }) => {
      // Stop in-flight refetches from overwriting the optimistic value when they resolve.
      await client.cancelQueries({ queryKey: qk.leads.all })

      const snapshot: Snapshot = {
        detail: client.getQueryData<Lead>(qk.leads.detail(lead.id)),
        lists: client.getQueriesData<Paginated<Lead>>({ queryKey: [...qk.leads.all, 'list'] }),
      }

      const patch = (l: Lead) => (l.id === lead.id ? { ...l, status } : l)
      client.setQueryData<Lead>(qk.leads.detail(lead.id), (old) => old && patch(old))
      client.setQueriesData<Paginated<Lead>>({ queryKey: [...qk.leads.all, 'list'] }, (page) =>
        page ? { ...page, items: page.items.map(patch) } : page,
      )
      return snapshot
    },

    onError: (_error, { lead }, snapshot) => {
      if (!snapshot) return
      client.setQueryData(qk.leads.detail(lead.id), snapshot.detail)
      for (const [key, data] of snapshot.lists) client.setQueryData(key, data)
    },

    onSuccess: (confirmed) => {
      // Server's record is authoritative (new version, timestamps).
      client.setQueryData(qk.leads.detail(confirmed.id), confirmed)
    },

    // Not returned/awaited: the mutation is "done" when the server confirms, not after these
    // background refetches — otherwise "Saving…" would linger for a second round-trip.
    onSettled: (_data, _error, { lead }) => {
      // Lists may need re-filtering (e.g. a "Contacted" filter no longer matches).
      void client.invalidateQueries({ queryKey: qk.leads.all })
      // The server drops AI suggestions generated against the old version.
      void client.invalidateQueries({ queryKey: qk.suggestions.for('lead', lead.id) })
      void client.invalidateQueries({ queryKey: qk.audit })
    },
  })
}
