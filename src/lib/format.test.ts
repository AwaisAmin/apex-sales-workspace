import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatNumber, formatRelative } from './format'

const NOW = new Date('2026-10-28T09:00:00Z')

describe('locale formatting', () => {
  it('uses Arabic-Indic digits and the riyal sign in Arabic', () => {
    const ar = formatCurrency(1250000, 'ar')
    expect(ar).toMatch(/١٬٢٥٠٬٠٠٠/)
    expect(ar).toContain('ر.س')
    expect(formatCurrency(1250000, 'en')).toMatch(/SAR\s1,250,000/)
  })

  it('formats plain numbers per locale', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234')
    expect(formatNumber(1234, 'ar')).toBe('١٬٢٣٤')
  })

  it('shows business dates in the Gregorian calendar in Arabic (not Hijri)', () => {
    // 2026 in Arabic-Indic digits; a Hijri rendering would show 1448.
    expect(formatDate('2026-10-29T10:00:00Z', 'ar')).toContain('٢٠٢٦')
  })

  it('formats relative time deterministically from an injected "now"', () => {
    expect(formatRelative('2026-10-25T09:00:00Z', 'en', NOW)).toBe('3 days ago')
    expect(formatRelative('2026-10-25T09:00:00Z', 'ar', NOW)).toBe('قبل ٣ أيام')
    expect(formatRelative('2026-11-11T09:00:00Z', 'en', NOW)).toBe('in 2 weeks')
  })
})
