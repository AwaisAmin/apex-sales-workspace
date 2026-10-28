import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { setChaos } from '@/mocks/chaos'
import { server } from '@/test/server'
import { api } from './endpoints'
import { ApiError } from './errors'
import { LeadQuery } from './schemas'
import { session } from './session'

const q = LeadQuery.parse({})

/** Counts requests that reach the (mock) network. */
function countRequests() {
  let n = 0
  server.events.on('request:start', () => void n++)
  return () => n
}

describe('typed API boundary', () => {
  it('returns schema-validated data', async () => {
    const page = await api.listLeads(q, 'en')
    expect(page.items).toHaveLength(10)
    expect(page.total).toBe(120)
  })

  it('rejects a response that does not match the contract (no bad data reaches the UI)', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json({ id: 1, name: 'not localized' })))
    await expect(api.me()).rejects.toMatchObject({ name: 'ApiError', code: 'INVALID_RESPONSE' })
  })

  it('maps HTTP failures to typed error codes', async () => {
    session.signIn('u-view')
    await expect(api.updateLeadStatus('lead-001', { status: 'qualified', version: 1 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    setChaos({ forceFailure: 401 })
    await expect(api.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('surfaces 422 field errors from the server', async () => {
    const error = await api.updateLeadStatus('lead-001', { status: 'new', version: 1 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('VALIDATION')
    expect((error as ApiError).fieldErrors.status?.[0]).toMatch(/Allowed/)
  })
})

describe('retry policy', () => {
  it('retries transient read failures 3 times, then gives up', async () => {
    setChaos({ flakyRate: 1 })
    const requests = countRequests()
    const client = createQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } })

    await expect(client.fetchQuery({ queryKey: ['t'], queryFn: () => api.listLeads(q, 'en') })).rejects.toMatchObject({
      code: 'SERVER',
    })
    expect(requests()).toBe(4) // 1 attempt + 3 retries
  })

  it('does not retry deterministic 4xx errors', async () => {
    setChaos({ forceFailure: 403 })
    const requests = countRequests()
    await expect(createQueryClient().fetchQuery({ queryKey: ['t'], queryFn: () => api.me() })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    expect(requests()).toBe(1)
  })

  it('never auto-retries writes (a timed-out write may already have succeeded)', async () => {
    setChaos({ forceWriteFailure: 500 })
    const requests = countRequests()
    const client = createQueryClient()
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => api.updateLeadStatus('lead-001', { status: 'qualified', version: 1 }),
    })
    await expect(mutation.execute(undefined)).rejects.toMatchObject({ code: 'SERVER' })
    expect(requests()).toBe(1)
  })

  it('flags the session as expired on any 401', async () => {
    setChaos({ forceFailure: 401 })
    await createQueryClient()
      .fetchQuery({ queryKey: ['t'], queryFn: () => api.me() })
      .catch(() => {})
    expect(session.get().expired).toBe(true)
  })
})
