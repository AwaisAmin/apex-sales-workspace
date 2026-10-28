import type {
  Activity,
  AiSuggestion,
  AuditEntry,
  Lead,
  LeadQuery,
  LeadStatus,
  Opportunity,
  OpportunityQuery,
  OpportunityStage,
  Paginated,
  UpdateLeadStatusInput,
  UpdateOpportunityInput,
  User,
} from '@/api/schemas'
import { createSeed } from './seed'

/*
 * In-memory "backend". Business rules (allowed transitions, version checks,
 * suggestion staleness) live here rather than in the UI, mirroring where a
 * real server would enforce them — the UI may pre-check, but never decides.
 */

/** Allowed lead status transitions. Anything else is a 422. */
export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'unqualified'],
  contacted: ['qualified', 'unqualified'],
  qualified: ['unqualified'],
  unqualified: ['contacted'],
}

const CLOSED: OpportunityStage[] = ['closed_won', 'closed_lost']
export const NEXT_STEP_MAX = 200

/** Thrown by db operations; handlers translate it into an HTTP error response. */
export class DbError extends Error {
  readonly status: 404 | 409 | 422
  readonly fieldErrors?: Record<string, string[]>

  constructor(status: 404 | 409 | 422, message: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function paginate<T>(rows: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize
  return { items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize }
}

function compare(a: unknown, b: unknown, collator: Intl.Collator): number {
  // Nulls (e.g. never contacted) always sort last regardless of direction.
  if (a === b) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

function matches(text: { en: string; ar: string }, needle: string) {
  return text.en.toLowerCase().includes(needle) || text.ar.includes(needle)
}

export function createDb(seed = createSeed()) {
  // Deep copy so tests can create isolated databases from the same seed.
  const state = structuredClone(seed)
  const audit: AuditEntry[] = []
  let auditSeq = 0

  function log(entry: Omit<AuditEntry, 'id' | 'at'>) {
    audit.unshift({ ...entry, id: `audit-${++auditSeq}`, at: new Date().toISOString() })
  }

  function findLead(id: string) {
    const lead = state.leads.find((l) => l.id === id)
    if (!lead) throw new DbError(404, `Lead ${id} not found`)
    return lead
  }

  function findOpportunity(id: string) {
    const opp = state.opportunities.find((o) => o.id === id)
    if (!opp) throw new DbError(404, `Opportunity ${id} not found`)
    return opp
  }

  function checkVersion(current: number, sent: number) {
    if (current !== sent) {
      throw new DbError(409, 'This record was changed by someone else. Reload to see the latest version.')
    }
  }

  /** An AI suggestion may only be applied to the exact version it was generated from. */
  function consumeSuggestion(suggestionId: string | undefined, targetId: string, currentVersion: number) {
    if (!suggestionId) return null
    const idx = state.suggestions.findIndex((s) => s.id === suggestionId && s.targetId === targetId)
    if (idx === -1) throw new DbError(404, 'Suggestion no longer exists')
    const suggestion = state.suggestions[idx] as AiSuggestion
    if (suggestion.targetVersion !== currentVersion) {
      throw new DbError(409, 'The record changed after this suggestion was generated.')
    }
    state.suggestions.splice(idx, 1)
    return suggestion
  }

  return {
    users: (): User[] => state.users,
    findUser: (id: string | null) => state.users.find((u) => u.id === id) ?? null,

    listLeads(q: LeadQuery, lang: 'en' | 'ar'): Paginated<Lead> {
      const collator = new Intl.Collator(lang === 'ar' ? 'ar' : 'en', { sensitivity: 'base' })
      const needle = q.search?.toLowerCase()
      const rows = state.leads.filter(
        (l) =>
          (q.status.length === 0 || q.status.includes(l.status)) &&
          (!q.city || l.city === q.city) &&
          (!needle || matches(l.company, needle) || matches(l.contactName, needle) || l.email.includes(needle)),
      )
      const key = (l: Lead) => (q.sort === 'company' ? l.company[lang] : l[q.sort])
      rows.sort((a, b) => {
        const ka = key(a)
        const kb = key(b)
        if (ka == null || kb == null) return compare(ka, kb, collator) || a.id.localeCompare(b.id) // nulls last in both directions
        // id tie-breaker keeps order stable, so equal values never jump between pages.
        return (q.dir === 'asc' ? 1 : -1) * compare(ka, kb, collator) || a.id.localeCompare(b.id)
      })
      return paginate(rows, q.page, q.pageSize)
    },

    getLead: (id: string) => findLead(id),

    activitiesFor: (leadId: string): Activity[] =>
      state.activities
        .filter((a) => a.leadId === leadId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),

    updateLeadStatus(id: string, input: UpdateLeadStatusInput, actorId: string): Lead {
      const lead = findLead(id)
      checkVersion(lead.version, input.version)
      if (!LEAD_TRANSITIONS[lead.status].includes(input.status)) {
        throw new DbError(422, `Cannot move a lead from "${lead.status}" to "${input.status}".`, {
          status: [`Allowed: ${LEAD_TRANSITIONS[lead.status].join(', ') || 'none'}`],
        })
      }
      const suggestion = consumeSuggestion(input.suggestionId, id, lead.version)
      const from = lead.status
      Object.assign(lead, {
        status: input.status,
        version: lead.version + 1,
        lastContactedAt: lead.lastContactedAt ?? new Date().toISOString(),
      })
      log({
        actorId,
        targetType: 'lead',
        targetId: id,
        action: suggestion ? 'suggestion_applied' : 'update',
        suggestionId: suggestion?.id ?? null,
        summary: `status: ${from} → ${input.status}`,
      })
      // Any other pending suggestion for this lead was generated against the old version.
      state.suggestions = state.suggestions.filter((s) => s.targetId !== id)
      return lead
    },

    listOpportunities(q: OpportunityQuery, lang: 'en' | 'ar'): Paginated<Opportunity> {
      const collator = new Intl.Collator(lang, { sensitivity: 'base' })
      const needle = q.search?.toLowerCase()
      const rows = state.opportunities.filter(
        (o) => (q.stage.length === 0 || q.stage.includes(o.stage)) && (!needle || matches(o.title, needle)),
      )
      rows.sort(
        (a, b) => (q.dir === 'asc' ? 1 : -1) * compare(a[q.sort], b[q.sort], collator) || a.id.localeCompare(b.id),
      )
      return paginate(rows, q.page, q.pageSize)
    },

    getOpportunity: (id: string) => findOpportunity(id),

    updateOpportunity(id: string, input: UpdateOpportunityInput, actorId: string): Opportunity {
      const opp = findOpportunity(id)
      checkVersion(opp.version, input.version)
      const fieldErrors: Record<string, string[]> = {}
      if (input.stage && CLOSED.includes(opp.stage) && input.stage !== opp.stage) {
        fieldErrors.stage = ['Closed opportunities cannot change stage.']
      }
      if (input.nextStep) {
        for (const lang of ['en', 'ar'] as const) {
          const value = input.nextStep[lang].trim()
          if (!value) fieldErrors[`nextStep.${lang}`] = ['Required']
          else if (value.length > NEXT_STEP_MAX) fieldErrors[`nextStep.${lang}`] = [`Max ${NEXT_STEP_MAX} characters`]
        }
      }
      if (Object.keys(fieldErrors).length > 0) throw new DbError(422, 'Validation failed', fieldErrors)

      const suggestion = consumeSuggestion(input.suggestionId, id, opp.version)
      const changes: string[] = []
      if (input.stage && input.stage !== opp.stage) {
        changes.push(`stage: ${opp.stage} → ${input.stage}`)
        opp.stage = input.stage
      }
      if (input.nextStep) {
        changes.push(`nextStep: "${input.nextStep.en}"`)
        opp.nextStep = input.nextStep
      }
      opp.version += 1
      opp.updatedAt = new Date().toISOString()
      log({
        actorId,
        targetType: 'opportunity',
        targetId: id,
        action: suggestion ? 'suggestion_applied' : 'update',
        suggestionId: suggestion?.id ?? null,
        summary: changes.join('; ') || 'no-op',
      })
      state.suggestions = state.suggestions.filter((s) => s.targetId !== id)
      return opp
    },

    suggestionsFor: (targetType: 'lead' | 'opportunity', targetId: string): AiSuggestion[] =>
      state.suggestions.filter((s) => s.targetType === targetType && s.targetId === targetId),

    dismissSuggestion(id: string, actorId: string) {
      const idx = state.suggestions.findIndex((s) => s.id === id)
      if (idx === -1) throw new DbError(404, 'Suggestion no longer exists')
      const [s] = state.suggestions.splice(idx, 1) as [AiSuggestion]
      log({
        actorId,
        targetType: s.targetType,
        targetId: s.targetId,
        action: 'suggestion_dismissed',
        suggestionId: s.id,
        summary: `dismissed ${s.change.field} suggestion`,
      })
    },

    audit: () => audit,
  }
}

export type Db = ReturnType<typeof createDb>
