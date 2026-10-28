import type { ApiErrorCode } from './schemas'

/** Server codes plus failures that only the client can observe. */
export type ClientErrorCode = ApiErrorCode | 'NETWORK' | 'INVALID_RESPONSE' | 'ABORTED'

/**
 * The only error type that crosses the API boundary. UI code switches on `code`,
 * never on raw HTTP statuses or fetch exceptions.
 */
export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number
  readonly fieldErrors: Record<string, string[]>
  /** From Retry-After on 429, in ms. */
  readonly retryAfterMs: number | null

  constructor(opts: {
    code: ClientErrorCode
    status: number
    message: string
    fieldErrors?: Record<string, string[]>
    retryAfterMs?: number | null
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.code = opts.code
    this.status = opts.status
    this.fieldErrors = opts.fieldErrors ?? {}
    this.retryAfterMs = opts.retryAfterMs ?? null
  }

  /**
   * Transient failures that may succeed if repeated unchanged. 4xx errors other than 429
   * are deterministic — retrying them only delays the error the user needs to see.
   */
  get isTransient(): boolean {
    return this.code === 'NETWORK' || this.code === 'RATE_LIMITED' || this.code === 'SERVER'
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
