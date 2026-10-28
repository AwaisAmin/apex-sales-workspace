/*
 * Fault injection for the mock backend. Lets a reviewer (or an E2E test) make
 * the "server" slow, flaky, or reject requests, so every loading/error/retry
 * path in the UI can be demonstrated on demand instead of waiting for luck.
 *
 * Sources, in priority order: URL query (?latency=none&fail=500) → localStorage → defaults.
 */

export type LatencyMode = 'none' | 'normal' | 'slow'
/** A status every matching request will return until cleared. */
export type ForcedFailure = null | 401 | 403 | 429 | 500

export interface ChaosSettings {
  latency: LatencyMode
  /** 0–1 probability that a read request randomly fails with 503 (exercises retry). */
  flakyRate: number
  /** Applies to all /api requests when set. */
  forceFailure: ForcedFailure
  /** Applies only to writes (PATCH/POST) when set — lets reads succeed while saves fail. */
  forceWriteFailure: ForcedFailure
}

export const DEFAULT_CHAOS: ChaosSettings = {
  latency: 'normal',
  flakyRate: 0,
  forceFailure: null,
  forceWriteFailure: null,
}

const STORAGE_KEY = 'apex.chaos'
const FAILURES = [401, 403, 429, 500] as const

function parseFailure(value: string | null | undefined): ForcedFailure {
  const n = Number(value)
  return (FAILURES as readonly number[]).includes(n) ? (n as ForcedFailure) : null
}

function fromUrl(search: string): Partial<ChaosSettings> {
  const params = new URLSearchParams(search)
  const out: Partial<ChaosSettings> = {}
  const latency = params.get('latency')
  if (latency === 'none' || latency === 'normal' || latency === 'slow') out.latency = latency
  if (params.has('flaky')) out.flakyRate = Math.min(1, Math.max(0, Number(params.get('flaky')) || 0))
  if (params.has('fail')) out.forceFailure = parseFailure(params.get('fail'))
  if (params.has('failWrite')) out.forceWriteFailure = parseFailure(params.get('failWrite'))
  return out
}

function fromStorage(): Partial<ChaosSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<ChaosSettings>) : {}
  } catch {
    return {}
  }
}

let settings: ChaosSettings = { ...DEFAULT_CHAOS }
const listeners = new Set<() => void>()

export function initChaos(search = typeof location === 'undefined' ? '' : location.search) {
  settings = { ...DEFAULT_CHAOS, ...fromStorage(), ...fromUrl(search) }
}

export function getChaos(): ChaosSettings {
  return settings
}

export function setChaos(patch: Partial<ChaosSettings>) {
  settings = { ...settings, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

/** For useSyncExternalStore in the dev panel. */
export function subscribeChaos(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function latencyFor(mode: LatencyMode): number {
  if (mode === 'none') return 0
  const [min, max] = mode === 'slow' ? [1500, 3000] : [250, 800]
  return min + Math.random() * (max - min)
}
