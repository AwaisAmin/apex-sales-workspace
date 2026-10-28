import { describe, expect, it } from 'vitest'
import { blockReason, confidenceBand, requiresAcknowledgement } from './policy'

const grounded = { evidence: [{ activityId: 'a1', excerpt: { en: 'x', ar: 'x' } }], targetVersion: 3 }

describe('confidenceBand', () => {
  it.each([
    [0.95, 'high'],
    [0.75, 'high'],
    [0.749, 'medium'],
    [0.5, 'medium'],
    [0.499, 'low'],
    [0, 'low'],
  ])('%s → %s', (value, band) => {
    expect(confidenceBand(value)).toBe(band)
  })
})

describe('blockReason (what the UI may offer for approval)', () => {
  it('allows a grounded, current suggestion for a rep or manager', () => {
    expect(blockReason(grounded, { currentVersion: 3, role: 'rep' })).toBeNull()
    expect(blockReason(grounded, { currentVersion: 3, role: 'manager' })).toBeNull()
  })

  it('never allows a suggestion without evidence, regardless of role or confidence', () => {
    expect(blockReason({ ...grounded, evidence: [] }, { currentVersion: 3, role: 'manager' })).toBe('noEvidence')
  })

  it('blocks a suggestion generated against an older version of the record', () => {
    expect(blockReason(grounded, { currentVersion: 4, role: 'rep' })).toBe('stale')
  })

  it('blocks read-only users', () => {
    expect(blockReason(grounded, { currentVersion: 3, role: 'viewer' })).toBe('readOnly')
  })

  it('fails closed while the role is still unknown', () => {
    expect(blockReason(grounded, { currentVersion: 3, role: undefined })).toBe('readOnly')
  })
})

describe('requiresAcknowledgement', () => {
  it('is required only for low-confidence suggestions', () => {
    expect(requiresAcknowledgement({ confidence: 0.4 })).toBe(true)
    expect(requiresAcknowledgement({ confidence: 0.62 })).toBe(false)
    expect(requiresAcknowledgement({ confidence: 0.9 })).toBe(false)
  })
})
