import type { Opportunity, OpportunityStage } from '@/api/schemas'

export const OPEN_STAGES: OpportunityStage[] = ['discovery', 'proposal', 'negotiation']

/** Expected revenue: amount × win probability. Derived on the client — not stored, so it can't drift. */
export function weightedValue(o: Pick<Opportunity, 'amount' | 'probability'>) {
  return Math.round(o.amount * o.probability)
}

/** An open deal whose expected close date has passed. `now` is injectable for tests. */
export function isOverdue(o: Pick<Opportunity, 'stage' | 'expectedCloseDate'>, now: Date = new Date()) {
  return OPEN_STAGES.includes(o.stage) && new Date(o.expectedCloseDate).getTime() < now.getTime()
}
