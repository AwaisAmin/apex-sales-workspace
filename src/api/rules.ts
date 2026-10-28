import type { LeadStatus } from './schemas'

/*
 * Business rules shared by the UI and the mock backend. The UI uses them only to
 * avoid offering choices that would fail; the backend enforces them regardless
 * (a stale or tampered client still gets a 422).
 */

/** Allowed lead status transitions. Anything else is a 422. */
export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'unqualified'],
  contacted: ['qualified', 'unqualified'],
  qualified: ['unqualified'],
  unqualified: ['contacted'],
}

export const NEXT_STEP_MAX = 200
