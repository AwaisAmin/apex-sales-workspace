import type { z } from 'zod'
import { ApiError } from './errors'
import { ApiErrorBody } from './schemas'
import { session, SESSION_HEADER } from './session'

const BASE_URL = '/api'

type Method = 'GET' | 'POST' | 'PATCH'
type QueryValue = string | number | readonly string[] | undefined

export interface RequestOptions<S extends z.ZodType | undefined> {
  method?: Method
  query?: Record<string, QueryValue>
  body?: unknown
  /** Response schema. Omit only for endpoints with no body (204). */
  schema: S
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  // Absolute base so the same client works in the browser and in Node (component tests).
  const origin = typeof location === 'undefined' ? 'http://localhost' : location.origin
  const url = new URL(BASE_URL + path, origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v))
    else url.searchParams.set(key, String(value))
  }
  return url
}

async function toApiError(res: Response): Promise<ApiError> {
  const retryAfter = Number(res.headers.get('Retry-After'))
  const parsed = ApiErrorBody.safeParse(await res.json().catch(() => null))
  return new ApiError({
    status: res.status,
    // A non-JSON error (e.g. from a proxy) still gets a meaningful code.
    code: parsed.success ? parsed.data.code : res.status >= 500 ? 'SERVER' : 'INVALID_RESPONSE',
    message: parsed.success ? parsed.data.message : res.statusText,
    fieldErrors: parsed.success ? parsed.data.fieldErrors : undefined,
    retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
  })
}

/**
 * The single place the app talks HTTP. Guarantees: callers receive either data
 * that passed schema validation, or an ApiError — nothing else.
 */
export async function request<S extends z.ZodType | undefined>(
  path: string,
  { method = 'GET', query, body, schema, signal }: RequestOptions<S>,
): Promise<S extends z.ZodType ? z.infer<S> : void> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const { userId } = session.get()
  if (userId) headers[SESSION_HEADER] = userId
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw new ApiError({ code: 'ABORTED', status: 0, message: 'Request cancelled' })
    throw new ApiError({ code: 'NETWORK', status: 0, message: e instanceof Error ? e.message : 'Network error' })
  }

  if (!res.ok) throw await toApiError(res)
  if (!schema || res.status === 204) return undefined as never

  const parsed = schema.safeParse(await res.json().catch(() => undefined))
  if (!parsed.success) {
    // Contract drift between frontend and backend: surface it loudly in dev, fail safely for users.
    console.error(`[api] ${method} ${path} response failed validation`, parsed.error.issues)
    throw new ApiError({ code: 'INVALID_RESPONSE', status: res.status, message: 'Unexpected response from server' })
  }
  return parsed.data as never
}
