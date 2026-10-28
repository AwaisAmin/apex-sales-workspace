import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { setTheme } from './theme'

afterEach(() => setTheme('system'))

describe('theme switcher', () => {
  it('pins light/dark on <html> and remembers it; "system" hands control back to the OS', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitcher />)
    expect(screen.getByRole('radio', { name: 'Match system' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('apex.theme')).toBe('dark')

    await user.click(screen.getByRole('radio', { name: 'Match system' }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem('apex.theme')).toBeNull()
  })

  it('is a named radio group operable with arrow keys', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitcher />)
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()

    screen.getByRole('radio', { name: 'Match system' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
