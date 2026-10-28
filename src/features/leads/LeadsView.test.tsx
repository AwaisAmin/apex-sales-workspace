import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { setChaos } from '@/mocks/chaos'
import { renderWithProviders } from '@/test/render'
import { LeadsView } from './LeadsView'

beforeEach(() => window.history.replaceState(null, '', '/leads'))

const rows = () => within(screen.getAllByRole('table')[0]!).getAllByRole('row').slice(1) // minus header

describe('leads list states', () => {
  it('loads a page and keeps filters in the URL', async () => {
    const { user } = renderWithProviders(<LeadsView />)
    expect(await screen.findByText('120 leads')).toBeInTheDocument()
    expect(rows()).toHaveLength(10)

    await user.click(screen.getByRole('checkbox', { name: 'Qualified' }))
    await waitFor(() => expect(window.location.search).toBe('?status=qualified'))
    await waitFor(() => rows().forEach((r) => expect(r).toHaveTextContent('Qualified')))
  })

  it('sorts via column header and exposes the state with aria-sort', async () => {
    const { user } = renderWithProviders(<LeadsView />)
    await screen.findByText('120 leads')
    await user.click(screen.getByRole('button', { name: 'Score' }))

    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: 'Score' })).toHaveAttribute('aria-sort', 'descending'),
    )
    await waitFor(() => {
      const scores = rows().map((r) => Number(r.children[3]!.textContent))
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
    })
  })

  it('shows an empty state with a way out', async () => {
    window.history.replaceState(null, '', '/leads?search=zzzz-no-match')
    const { user } = renderWithProviders(<LeadsView />)
    expect(await screen.findByText(/no leads match/i)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /clear filters/i }).at(-1)!)
    expect(await screen.findByText('120 leads')).toBeInTheDocument()
  })

  it('shows an error state after retries are exhausted, and recovers on "Try again"', async () => {
    setChaos({ forceFailure: 500 })
    const { user } = renderWithProviders(<LeadsView />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/server had a problem/i)
    expect(alert).toHaveTextContent(/retried automatically/i)

    setChaos({ forceFailure: null })
    await user.click(within(alert).getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('120 leads')).toBeInTheDocument()
  })
})
