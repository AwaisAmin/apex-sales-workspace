import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ar } from './locales/ar'
import { en } from './locales/en'

function keyPaths(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('bilingual interface', () => {
  it('Arabic has exactly the same keys as English, and none are empty', () => {
    expect(keyPaths(ar).sort()).toEqual(keyPaths(en).sort())
    for (const path of keyPaths(ar)) {
      const value = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], ar)
      expect(value, path).not.toBe('')
    }
  })

  it('switching language flips the document to RTL Arabic and persists the choice', async () => {
    render(<LanguageSwitcher />)
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')

    await userEvent.click(screen.getByRole('button', { name: 'العربية' }))

    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(localStorage.getItem('apex.locale')).toBe('ar')
    // The button now offers English, labelled in English for screen readers.
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('lang', 'en')
  })
})
