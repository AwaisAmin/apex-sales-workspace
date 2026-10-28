import type { Locale } from '@/i18n/config'
import type { LeadQuery, OpportunityQuery } from './schemas'

/*
 * Hierarchical query keys. Invalidating a prefix (e.g. qk.leads.all) refreshes
 * every list page and detail under it, so writes never leave stale views behind.
 */
export const qk = {
  me: (userId: string | null) => ['me', userId] as const,
  users: ['users'] as const,
  leads: {
    all: ['leads'] as const,
    list: (q: LeadQuery, lang: Locale) => ['leads', 'list', q, lang] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    activities: (id: string) => ['leads', 'activities', id] as const,
  },
  opportunities: {
    all: ['opportunities'] as const,
    list: (q: OpportunityQuery, lang: Locale) => ['opportunities', 'list', q, lang] as const,
    detail: (id: string) => ['opportunities', 'detail', id] as const,
  },
  suggestions: {
    all: ['suggestions'] as const,
    for: (targetType: 'lead' | 'opportunity', targetId: string) => ['suggestions', targetType, targetId] as const,
  },
  audit: ['audit'] as const,
}
