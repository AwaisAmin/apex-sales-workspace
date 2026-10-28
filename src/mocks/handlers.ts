import { delay, http, HttpResponse } from 'msw'
import type { z } from 'zod'
import {
  LeadQuery,
  OpportunityQuery,
  UpdateLeadStatusInput,
  UpdateOpportunityInput,
  type ApiErrorBody,
  type User,
} from '@/api/schemas'
import { SESSION_HEADER } from '@/api/session'
import { getChaos, latencyFor } from './chaos'
import { DbError, type Db } from './db'

// Origin wildcard: matches same-origin requests in the browser and absolute URLs in Node tests.
const API = '*/api'

const STATUS_CODE: Record<number, ApiErrorBody['code']> = {
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
  500: 'SERVER',
  503: 'SERVER',
}

function error(status: number, message: string, fieldErrors?: Record<string, string[]>) {
  const body: ApiErrorBody = { code: STATUS_CODE[status] ?? 'SERVER', message, fieldErrors }
  return HttpResponse.json(body, {
    status,
    headers: status === 429 ? { 'Retry-After': '2' } : undefined,
  })
}

type Ctx = { request: Request; params: Record<string, string | readonly string[] | undefined>; user: User }
type Resolver = (ctx: Ctx) => Response | Promise<Response>

/**
 * Every endpoint runs through the same pipeline a real gateway would:
 * latency → injected faults → authentication → authorization → handler → error mapping.
 */
function endpoint(db: Db, kind: 'read' | 'write', resolve: Resolver) {
  return async ({ request, params }: Omit<Ctx, 'user'>) => {
    const chaos = getChaos()
    await delay(latencyFor(chaos.latency))

    const forced = chaos.forceFailure ?? (kind === 'write' ? chaos.forceWriteFailure : null)
    if (forced) return error(forced, `Simulated ${forced} (chaos panel)`)

    const user = db.findUser(request.headers.get(SESSION_HEADER))
    if (!user) return error(401, 'Your session has expired. Please sign in again.')
    if (kind === 'write' && user.role === 'viewer') {
      return error(403, 'Your role is read-only and cannot change records.')
    }

    // Transient failures only on reads: reads are idempotent and safe to retry automatically.
    if (kind === 'read' && Math.random() < chaos.flakyRate) {
      return error(503, 'Service temporarily unavailable')
    }

    try {
      return await resolve({ request, params, user })
    } catch (e) {
      if (e instanceof DbError) return error(e.status, e.message, e.fieldErrors)
      console.error(e)
      return error(500, 'Unexpected server error')
    }
  }
}

function lang(url: URL): 'en' | 'ar' {
  return url.searchParams.get('lang') === 'ar' ? 'ar' : 'en'
}

/** Query strings are untrusted input: coerce, then validate with the same schema the client uses. */
function parseQuery<S extends z.ZodType>(schema: S, url: URL, arrays: string[]) {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of url.searchParams) {
    if (key === 'lang' || value === '') continue
    if (arrays.includes(key)) raw[key] = url.searchParams.getAll(key)
    else if (key === 'page' || key === 'pageSize') raw[key] = Number(value)
    else raw[key] = value
  }
  return schema.safeParse(raw)
}

async function parseBody<S extends z.ZodType>(schema: S, request: Request) {
  const json: unknown = await request.json().catch(() => undefined)
  return schema.safeParse(json)
}

function validationError(issues: z.core.$ZodIssue[]) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.') || '_'
    ;(fieldErrors[path] ??= []).push(issue.message)
  }
  return error(422, 'Validation failed', fieldErrors)
}

const id = (params: Ctx['params']) => String(params.id)

export function createHandlers(db: Db) {
  return [
    http.get(
      `${API}/me`,
      endpoint(db, 'read', ({ user }) => HttpResponse.json(user)),
    ),

    http.get(
      `${API}/users`,
      endpoint(db, 'read', () => HttpResponse.json(db.users())),
    ),

    http.get(
      `${API}/leads`,
      endpoint(db, 'read', ({ request }) => {
        const url = new URL(request.url)
        const q = parseQuery(LeadQuery, url, ['status'])
        if (!q.success) return validationError(q.error.issues)
        return HttpResponse.json(db.listLeads(q.data, lang(url)))
      }),
    ),

    http.get(
      `${API}/leads/:id`,
      endpoint(db, 'read', ({ params }) => HttpResponse.json(db.getLead(id(params)))),
    ),

    http.get(
      `${API}/leads/:id/activities`,
      endpoint(db, 'read', ({ params }) => HttpResponse.json(db.activitiesFor(id(params)))),
    ),

    http.patch(
      `${API}/leads/:id/status`,
      endpoint(db, 'write', async ({ request, params, user }) => {
        const body = await parseBody(UpdateLeadStatusInput, request)
        if (!body.success) return validationError(body.error.issues)
        return HttpResponse.json(db.updateLeadStatus(id(params), body.data, user.id))
      }),
    ),

    http.get(
      `${API}/opportunities`,
      endpoint(db, 'read', ({ request }) => {
        const url = new URL(request.url)
        const q = parseQuery(OpportunityQuery, url, ['stage'])
        if (!q.success) return validationError(q.error.issues)
        return HttpResponse.json(db.listOpportunities(q.data, lang(url)))
      }),
    ),

    http.get(
      `${API}/opportunities/:id`,
      endpoint(db, 'read', ({ params }) => HttpResponse.json(db.getOpportunity(id(params)))),
    ),

    http.patch(
      `${API}/opportunities/:id`,
      endpoint(db, 'write', async ({ request, params, user }) => {
        const body = await parseBody(UpdateOpportunityInput, request)
        if (!body.success) return validationError(body.error.issues)
        return HttpResponse.json(db.updateOpportunity(id(params), body.data, user.id))
      }),
    ),

    http.get(
      `${API}/suggestions`,
      endpoint(db, 'read', ({ request }) => {
        const url = new URL(request.url)
        const targetType = url.searchParams.get('targetType')
        const targetId = url.searchParams.get('targetId')
        if ((targetType !== 'lead' && targetType !== 'opportunity') || !targetId) {
          return error(422, 'targetType and targetId are required')
        }
        return HttpResponse.json(db.suggestionsFor(targetType, targetId))
      }),
    ),

    http.post(
      `${API}/suggestions/:id/dismiss`,
      endpoint(db, 'write', ({ params, user }) => {
        db.dismissSuggestion(id(params), user.id)
        return new HttpResponse(null, { status: 204 })
      }),
    ),

    http.get(
      `${API}/audit`,
      endpoint(db, 'read', () => HttpResponse.json(db.audit())),
    ),

    // Demo-only: not part of the product API. Bypasses chaos/auth so it works while failures are injected.
    http.post(`${API}/__demo/external-edit/:type/:id`, ({ params }) => {
      try {
        const type = params.type === 'opportunity' ? 'opportunity' : 'lead'
        return HttpResponse.json(db.simulateExternalEdit(type, String(params.id)))
      } catch (e) {
        return e instanceof DbError ? error(e.status, e.message) : error(500, 'Unexpected server error')
      }
    }),
  ]
}
