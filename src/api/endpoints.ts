import { z } from 'zod'
import type { Locale } from '@/i18n/config'
import { request } from './client'
import {
  Activity,
  AiSuggestion,
  AuditEntry,
  Lead,
  Opportunity,
  paginated,
  User,
  type LeadQuery,
  type OpportunityQuery,
  type UpdateLeadStatusInput,
  type UpdateOpportunityInput,
} from './schemas'

const LeadPage = paginated(Lead)
const OpportunityPage = paginated(Opportunity)

/** Typed endpoint functions — the only API surface components and hooks use. */
export const api = {
  me: (signal?: AbortSignal) => request('/me', { schema: User, signal }),

  users: (signal?: AbortSignal) => request('/users', { schema: z.array(User), signal }),

  listLeads: (q: LeadQuery, lang: Locale, signal?: AbortSignal) =>
    request('/leads', { query: { ...q, lang }, schema: LeadPage, signal }),

  getLead: (id: string, signal?: AbortSignal) => request(`/leads/${id}`, { schema: Lead, signal }),

  leadActivities: (id: string, signal?: AbortSignal) =>
    request(`/leads/${id}/activities`, { schema: z.array(Activity), signal }),

  updateLeadStatus: (id: string, input: UpdateLeadStatusInput) =>
    request(`/leads/${id}/status`, { method: 'PATCH', body: input, schema: Lead }),

  listOpportunities: (q: OpportunityQuery, lang: Locale, signal?: AbortSignal) =>
    request('/opportunities', { query: { ...q, lang }, schema: OpportunityPage, signal }),

  getOpportunity: (id: string, signal?: AbortSignal) =>
    request(`/opportunities/${id}`, { schema: Opportunity, signal }),

  updateOpportunity: (id: string, input: UpdateOpportunityInput) =>
    request(`/opportunities/${id}`, { method: 'PATCH', body: input, schema: Opportunity }),

  suggestions: (targetType: 'lead' | 'opportunity', targetId: string, signal?: AbortSignal) =>
    request('/suggestions', { query: { targetType, targetId }, schema: z.array(AiSuggestion), signal }),

  dismissSuggestion: (id: string) => request(`/suggestions/${id}/dismiss`, { method: 'POST', schema: undefined }),

  audit: (signal?: AbortSignal) => request('/audit', { schema: z.array(AuditEntry), signal }),
}
