import { describe, expect, it } from 'vitest'
import { isOverdue, weightedValue } from './opportunity'

const NOW = new Date('2026-10-28T09:00:00Z')

describe('opportunity derived values', () => {
  it('weighted value = amount × probability, rounded to whole riyals', () => {
    expect(weightedValue({ amount: 945000, probability: 0.45 })).toBe(425250)
    expect(weightedValue({ amount: 100001, probability: 0.333 })).toBe(33300)
  })

  it('an open deal past its close date is overdue; a closed one never is', () => {
    const past = '2026-10-01T00:00:00Z'
    expect(isOverdue({ stage: 'negotiation', expectedCloseDate: past }, NOW)).toBe(true)
    expect(isOverdue({ stage: 'closed_won', expectedCloseDate: past }, NOW)).toBe(false)
    expect(isOverdue({ stage: 'proposal', expectedCloseDate: '2026-12-01T00:00:00Z' }, NOW)).toBe(false)
  })
})
