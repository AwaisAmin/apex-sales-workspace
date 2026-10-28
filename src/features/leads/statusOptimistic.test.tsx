import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { setChaos } from '@/mocks/chaos'
import { renderWithProviders } from '@/test/render'
import { db, server } from '@/test/server'
import { LeadDetailPanel } from './LeadDetailPanel'

/** Holds the PATCH until the test decides how the server responds. */
function deferWrite() {
  let respond!: (r: Response) => void
  server.use(
    http.patch('*/api/leads/:id/status', () => new Promise<Response>((resolve) => (respond = resolve)), { once: true }),
  )
  return (r: Response) => respond(r)
}

const currentStep = () => within(screen.getByTestId('status-control')).getByRole('listitem', { current: 'step' })

describe('manual status change — optimistic with rollback', () => {
  it('shows the new status immediately, before the server answers', async () => {
    const respond = deferWrite()
    const { user } = renderWithProviders(<LeadDetailPanel leadId="lead-001" onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: /mark as qualified/i }))

    expect(currentStep()).toHaveTextContent('Qualified') // optimistic
    expect(db.getLead('lead-001').status).toBe('contacted') // server not changed yet

    respond(HttpResponse.json({ ...db.getLead('lead-001'), status: 'qualified', version: 2 }))
    await screen.findByText(/status changed to qualified/i)
  })

  // The post-error background refetch would eventually show the server value anyway, which can hide a
  // missing rollback. Making that refetch slow proves the UI is restored *immediately* by the rollback.
  it('rolls back immediately and explains when the server rejects the change', async () => {
    const respond = deferWrite()
    const { user } = renderWithProviders(<LeadDetailPanel leadId="lead-001" onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: /mark as qualified/i }))
    expect(currentStep()).toHaveTextContent('Qualified')

    setChaos({ latency: 'slow' }) // refetches now take ≥1.5 s
    respond(HttpResponse.json({ code: 'SERVER', message: 'boom' }, { status: 500 }))

    expect(await screen.findByTestId('status-rollback')).toHaveTextContent(/undone.*contacted/i)
    expect(currentStep()).toHaveTextContent('Contacted') // no waitFor: restored from the snapshot, not the refetch
  })

  it('rolls back immediately on a version conflict (another user edited the lead)', async () => {
    const { user } = renderWithProviders(<LeadDetailPanel leadId="lead-001" onClose={() => {}} />)
    await screen.findByRole('button', { name: /mark as qualified/i })
    db.simulateExternalEdit('lead', 'lead-001')
    const respond = deferWrite()

    await user.click(screen.getByRole('button', { name: /mark as qualified/i }))
    setChaos({ latency: 'slow' })
    respond(HttpResponse.json({ code: 'CONFLICT', message: 'stale' }, { status: 409 }))

    expect(await screen.findByTestId('status-rollback')).toHaveTextContent(/someone else changed/i)
    expect(currentStep()).toHaveTextContent('Contacted')
    expect(db.getLead('lead-001').status).toBe('contacted')
  })

  it('keeps keyboard focus inside the section after the pressed button disappears', async () => {
    const { user } = renderWithProviders(<LeadDetailPanel leadId="lead-001" onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: /mark as qualified/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Status' })).toHaveFocus())
  })
})
