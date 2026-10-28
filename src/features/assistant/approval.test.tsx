import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { session } from '@/api/session'
import { LeadDetailPanel } from '@/features/leads/LeadDetailPanel'
import { renderWithProviders } from '@/test/render'
import { db, server } from '@/test/server'

/** Records every write the UI sends to the (mock) server. */
function trackWrites() {
  const writes: string[] = []
  server.events.on('request:start', ({ request }) => {
    if (request.method !== 'GET') writes.push(`${request.method} ${new URL(request.url).pathname}`)
  })
  return writes
}

const open = (leadId: string) => renderWithProviders(<LeadDetailPanel leadId={leadId} onClose={() => {}} />)

describe('AI suggestion → human approval gate', () => {
  it('shows a grounded suggestion as a proposal, not an applied change', async () => {
    open('lead-001')
    const card = await screen.findByTestId('suggestion-card')
    expect(within(card).getByText(/not applied/i)).toBeInTheDocument()
    expect(within(card).getByText(/confidence/i)).toBeInTheDocument()
    expect(within(card).getAllByRole('link', { name: /show in timeline/i }).length).toBeGreaterThan(0)
    expect(within(card).getByText(/limitations/i)).toBeInTheDocument()
  })

  it('opening the review and cancelling never writes anything', async () => {
    const writes = trackWrites()
    const { user } = open('lead-001')
    await user.click(await screen.findByRole('button', { name: /review & apply/i }))

    const dialog = await screen.findByRole('dialog', { name: /apply ai suggestion/i })
    // Safe default: Cancel has focus, so pressing Enter by reflex does not apply the change.
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus()

    await user.click(within(dialog).getByRole('button', { name: /cancel/i }))
    expect(writes).toEqual([])
    expect(db.getLead('lead-001').status).toBe('contacted')
  })

  it('applies exactly one write after explicit approval, and records it in the audit trail', async () => {
    const writes = trackWrites()
    const { user } = open('lead-001')
    await user.click(await screen.findByRole('button', { name: /review & apply/i }))
    await user.click(await screen.findByRole('button', { name: /approve & apply/i }))

    await screen.findByText(/change applied and logged/i)
    expect(writes).toEqual(['PATCH /api/leads/lead-001/status'])
    expect(db.getLead('lead-001').status).toBe('qualified')
    expect(db.audit()[0]).toMatchObject({ action: 'suggestion_applied', actorId: 'u-rep' })
  })

  it('can be reopened immediately after Escape (no stuck dialog when close and reopen are batched)', async () => {
    const { user } = open('lead-001')
    const review = await screen.findByRole('button', { name: /review & apply/i })
    await user.click(review)
    const approval = await screen.findByRole('dialog', { name: /apply ai suggestion/i })

    // Browser closes the dialog (Escape) and the user re-activates Review in the same tick.
    act(() => {
      ;(approval as HTMLDialogElement).close()
      review.click()
    })

    expect(await screen.findByRole('dialog', { name: /apply ai suggestion/i })).toHaveAttribute('open')
  })

  it('announces the outcome from inside the open drawer (not from the inert page behind it)', async () => {
    const { user } = open('lead-001')
    await user.click(await screen.findByRole('button', { name: /review & apply/i }))
    await user.click(await screen.findByRole('button', { name: /approve & apply/i }))
    const message = await screen.findByText(/change applied and logged/i)
    expect(message.closest('dialog[open]')).not.toBeNull()
    expect(message.closest('[aria-live="polite"]')).not.toBeNull()
  })

  it('requires an explicit acknowledgement before applying a low-confidence suggestion', async () => {
    const { user } = open('lead-044') // seeded at 48% confidence
    await user.click(await screen.findByRole('button', { name: /review & apply/i }))
    const dialog = await screen.findByRole('dialog', { name: /apply ai suggestion/i })
    const approve = within(dialog).getByRole('button', { name: /approve & apply/i })

    expect(approve).toHaveAttribute('aria-disabled', 'true')
    await user.click(approve)
    expect(db.getLead('lead-044').status).toBe('contacted')

    await user.click(within(dialog).getByRole('checkbox', { name: /reviewed the evidence/i }))
    expect(approve).not.toHaveAttribute('aria-disabled')
  })

  it('lets a read-only user review but not apply, and says why', async () => {
    session.signIn('u-view')
    const writes = trackWrites()
    const { user } = open('lead-001')

    expect(await screen.findByTestId('suggestion-blocked')).toHaveTextContent(/read-only/i)
    await user.click(screen.getByRole('button', { name: /review & apply/i }))
    expect(screen.queryByRole('dialog', { name: /apply ai suggestion/i })).not.toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it('a suggestion becomes non-actionable once the record changes underneath it', async () => {
    db.simulateExternalEdit('lead', 'lead-001')
    open('lead-001')
    await waitFor(() => expect(screen.getByTestId('suggestion-blocked')).toHaveTextContent(/out of date/i))
  })
})
