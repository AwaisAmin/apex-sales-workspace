import { z } from 'zod'

/*
 * Domain contract between the UI and the (mocked) backend.
 * Every response is parsed with these schemas at the API boundary, so the rest
 * of the app works with trusted, typed data — a malformed payload becomes a
 * handled error instead of `undefined` deep inside a component.
 * TypeScript types are inferred from the schemas, so the two can never drift.
 */

/**
 * Display text in both languages. Assumption: the synthetic CRM stores names in
 * Arabic and English (common for Saudi B2B records); real data may have only one.
 */
export const LocalizedText = z.object({ en: z.string(), ar: z.string() })
export type LocalizedText = z.infer<typeof LocalizedText>

const IsoDate = z.iso.datetime({ offset: true })

// ---------- Users & roles ----------

/** `viewer` is read-only — used to demonstrate 403 Forbidden on writes. */
export const Role = z.enum(['rep', 'manager', 'viewer'])
export type Role = z.infer<typeof Role>

export const User = z.object({
  id: z.string(),
  name: LocalizedText,
  role: Role,
})
export type User = z.infer<typeof User>

// ---------- Leads ----------

export const City = z.enum(['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar'])
export type City = z.infer<typeof City>

export const Industry = z.enum([
  'retail',
  'construction',
  'logistics',
  'hospitality',
  'healthcare',
  'manufacturing',
  'technology',
])
export type Industry = z.infer<typeof Industry>

export const LeadSource = z.enum(['website', 'referral', 'event', 'linkedin', 'cold_call'])
export type LeadSource = z.infer<typeof LeadSource>

export const LeadStatus = z.enum(['new', 'contacted', 'qualified', 'unqualified'])
export type LeadStatus = z.infer<typeof LeadStatus>

export const Lead = z.object({
  id: z.string(),
  contactName: LocalizedText,
  company: LocalizedText,
  email: z.email(),
  phone: z.string(),
  city: City,
  industry: Industry,
  source: LeadSource,
  status: LeadStatus,
  /** 0–100 fit score */
  score: z.number().int().min(0).max(100),
  /** SAR */
  estimatedValue: z.number().nonnegative(),
  ownerId: z.string(),
  createdAt: IsoDate,
  lastContactedAt: IsoDate.nullable(),
  /** Incremented on every write; stale writes are rejected with 409 (optimistic concurrency). */
  version: z.number().int(),
})
export type Lead = z.infer<typeof Lead>

// ---------- Opportunities ----------

export const OpportunityStage = z.enum([
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
])
export type OpportunityStage = z.infer<typeof OpportunityStage>

export const Opportunity = z.object({
  id: z.string(),
  leadId: z.string(),
  title: LocalizedText,
  stage: OpportunityStage,
  /** SAR */
  amount: z.number().nonnegative(),
  /** 0–1 */
  probability: z.number().min(0).max(1),
  expectedCloseDate: IsoDate,
  nextStep: LocalizedText.nullable(),
  ownerId: z.string(),
  updatedAt: IsoDate,
  version: z.number().int(),
})
export type Opportunity = z.infer<typeof Opportunity>

// ---------- Activities (the evidence AI suggestions cite) ----------

export const ActivityType = z.enum(['email', 'call', 'meeting', 'note'])
export type ActivityType = z.infer<typeof ActivityType>

export const Activity = z.object({
  id: z.string(),
  leadId: z.string(),
  type: ActivityType,
  summary: LocalizedText,
  occurredAt: IsoDate,
})
export type Activity = z.infer<typeof Activity>

// ---------- AI suggestions ----------

/**
 * What the assistant proposes to change. A closed union: the AI can only ever
 * propose these specific, reviewable field changes — never arbitrary writes.
 * `from` is recorded so the approval UI can show a before → after diff.
 */
export const ProposedChange = z.discriminatedUnion('field', [
  z.object({ field: z.literal('leadStatus'), from: LeadStatus, to: LeadStatus }),
  z.object({ field: z.literal('opportunityStage'), from: OpportunityStage, to: OpportunityStage }),
  z.object({ field: z.literal('nextStep'), from: LocalizedText.nullable(), to: LocalizedText }),
])
export type ProposedChange = z.infer<typeof ProposedChange>

export const Evidence = z.object({
  activityId: z.string(),
  /** Short quote/summary of why this activity supports the suggestion */
  excerpt: LocalizedText,
})
export type Evidence = z.infer<typeof Evidence>

export const AiSuggestion = z.object({
  id: z.string(),
  targetType: z.enum(['lead', 'opportunity']),
  targetId: z.string(),
  /** Version of the target the suggestion was generated against; used to detect staleness. */
  targetVersion: z.number().int(),
  rationale: LocalizedText,
  /** 0–1, model self-reported. Shown as a band (low/medium/high), not false precision. */
  confidence: z.number().min(0).max(1),
  limitations: z.array(LocalizedText),
  /** Grounding. A suggestion with no evidence is never shown as actionable. */
  evidence: z.array(Evidence),
  change: ProposedChange,
  model: z.string(),
  generatedAt: IsoDate,
})
export type AiSuggestion = z.infer<typeof AiSuggestion>

// ---------- Lists, queries, errors ----------

export const SortDir = z.enum(['asc', 'desc'])
export type SortDir = z.infer<typeof SortDir>

export const LeadSortField = z.enum(['company', 'score', 'estimatedValue', 'createdAt', 'lastContactedAt'])
export type LeadSortField = z.infer<typeof LeadSortField>

export const LeadQuery = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(10),
  sort: LeadSortField.default('createdAt'),
  dir: SortDir.default('desc'),
  status: z.array(LeadStatus).default([]),
  city: City.optional(),
  search: z.string().trim().max(100).optional(),
})
export type LeadQuery = z.infer<typeof LeadQuery>

export const OpportunitySortField = z.enum(['amount', 'probability', 'expectedCloseDate', 'updatedAt'])
export type OpportunitySortField = z.infer<typeof OpportunitySortField>

export const OpportunityQuery = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(10),
  sort: OpportunitySortField.default('expectedCloseDate'),
  dir: SortDir.default('asc'),
  stage: z.array(OpportunityStage).default([]),
  search: z.string().trim().max(100).optional(),
})
export type OpportunityQuery = z.infer<typeof OpportunityQuery>

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  })
}
export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }

export const ApiErrorCode = z.enum([
  'UNAUTHORIZED', // 401 — session missing/expired
  'FORBIDDEN', // 403 — authenticated but role not allowed
  'NOT_FOUND', // 404
  'CONFLICT', // 409 — stale version
  'VALIDATION', // 422 — field errors
  'RATE_LIMITED', // 429
  'SERVER', // 5xx
])
export type ApiErrorCode = z.infer<typeof ApiErrorCode>

export const ApiErrorBody = z.object({
  code: ApiErrorCode,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBody>

// ---------- Write payloads ----------

/** Lead status transitions are validated server-side; `version` enables 409 on stale writes. */
export const UpdateLeadStatusInput = z.object({
  status: LeadStatus,
  version: z.number().int(),
  /** Present when the change originated from an approved AI suggestion (audit trail). */
  suggestionId: z.string().optional(),
})
export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusInput>

export const UpdateOpportunityInput = z.object({
  stage: OpportunityStage.optional(),
  nextStep: LocalizedText.optional(),
  version: z.number().int(),
  suggestionId: z.string().optional(),
})
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunityInput>
