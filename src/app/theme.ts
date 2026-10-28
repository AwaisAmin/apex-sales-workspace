import { useSyncExternalStore } from 'react'

/*
 * Theme preference. "system" follows the OS (prefers-color-scheme); "light"/"dark"
 * pin it via <html data-theme>, which flips `color-scheme` and therefore every
 * light-dark() token. The same logic runs inline in index.html before first paint,
 * so there is no flash of the wrong theme on load.
 */

export const THEMES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEMES)[number]

const STORAGE_KEY = 'apex.theme'

function isTheme(value: unknown): value is ThemePreference {
  return THEMES.includes(value as ThemePreference)
}

export function readTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: ThemePreference) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

let current: ThemePreference = readTheme()
const listeners = new Set<() => void>()

export function setTheme(theme: ThemePreference) {
  current = theme
  applyTheme(theme)
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* storage unavailable — the choice lasts for this page only */
  }
  listeners.forEach((l) => l())
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => current,
  )
  return [theme, setTheme] as const
}
