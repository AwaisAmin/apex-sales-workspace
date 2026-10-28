import type { AiSuggestion, Role } from '@/api/schemas'

/*
 * AI-safety rules as pure functions: no React, no I/O — so they are unit-tested
 * directly and the UI cannot accidentally bypass them. The server enforces the
 * same constraints (version match, role) independently; these only decide what
 * the UI offers.
 */

export type ConfidenceBand = 'high' | 'medium' | 'low'

/** Bands instead of raw percentages: model self-reported scores are not calibrated enough for 82% vs 79% to mean anything. */
export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.75) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

export type BlockReason = 'noEvidence' | 'stale' | 'readOnly'

/** Why a suggestion may be read but not applied — or null if it can be offered for approval. */
export function blockReason(
  s: Pick<AiSuggestion, 'evidence' | 'targetVersion'>,
  ctx: { currentVersion: number | undefined; role: Role | undefined },
): BlockReason | null {
  // Ungrounded output is never actionable, however confident the model claims to be.
  if (s.evidence.length === 0) return 'noEvidence'
  if (ctx.currentVersion !== undefined && s.targetVersion !== ctx.currentVersion) return 'stale'
  // Unknown role (still loading) is treated as read-only: fail closed.
  if (ctx.role !== 'rep' && ctx.role !== 'manager') return 'readOnly'
  return null
}

/** Low-confidence suggestions need an explicit "I reviewed the evidence" acknowledgement before applying. */
export function requiresAcknowledgement(s: Pick<AiSuggestion, 'confidence'>): boolean {
  return confidenceBand(s.confidence) === 'low'
}
