import { useCallback, useMemo } from 'react'
import type { z } from 'zod'
import { navigate, useLocation } from './router'

/**
 * Typed list state (page, sort, filters) stored in the URL query string.
 * The URL is the source of truth, so a filtered view can be bookmarked, shared,
 * and survives reload. Invalid/tampered params fall back to schema defaults.
 */
const NONE: string[] = []

/** Pass `arrayKeys`/`extraKeys` as module-level constants so memoization holds. */
export function useUrlQuery<S extends z.ZodObject>(schema: S, arrayKeys = NONE, extraKeys = NONE) {
  const { pathname, search } = useLocation()

  const query = useMemo(() => {
    const params = new URLSearchParams(search)
    const raw: Record<string, unknown> = {}
    for (const key of Object.keys(schema.shape)) {
      if (arrayKeys.includes(key)) {
        const values = params.getAll(key)
        if (values.length) raw[key] = values
      } else {
        const value = params.get(key)
        if (value === null || value === '') continue
        raw[key] = key === 'page' || key === 'pageSize' ? Number(value) : value
      }
    }
    const parsed = schema.safeParse(raw)
    if (parsed.success) return parsed.data as z.infer<S>
    // Drop only the invalid fields, keep the valid ones.
    const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])))
    for (const key of bad) delete raw[key]
    return schema.parse(raw) as z.infer<S>
  }, [search, schema, arrayKeys])

  const defaults = useMemo(() => schema.parse({}) as Record<string, unknown>, [schema])

  const setQuery = useCallback(
    (patch: Partial<z.infer<S>>, opts: { replace?: boolean } = {}) => {
      const current = new URLSearchParams(window.location.search)
      const next = { ...query, ...patch } as Record<string, unknown>
      // Any filter/sort change invalidates the current page number.
      if (!('page' in patch)) next.page = 1
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === '') continue
        if (JSON.stringify(value) === JSON.stringify(defaults[key])) continue // keep URLs short
        if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)))
        else params.set(key, String(value))
      }
      // Preserve non-list params (e.g. the selected record) owned by other components.
      for (const key of extraKeys) {
        const v = current.get(key)
        if (v !== null) params.set(key, v)
      }
      const qs = params.toString()
      navigate(qs ? `${pathname}?${qs}` : pathname, opts)
    },
    [query, defaults, pathname, extraKeys],
  )

  return [query, setQuery] as const
}

/** Read/write a single URL param (e.g. ?lead=lead-001 for the detail panel). */
export function useUrlParam(key: string) {
  const { pathname, search } = useLocation()
  const value = new URLSearchParams(search).get(key)
  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(window.location.search)
      if (next === null) params.delete(key)
      else params.set(key, next)
      const qs = params.toString()
      navigate(qs ? `${pathname}?${qs}` : pathname)
    },
    [key, pathname],
  )
  return [value, setValue] as const
}
