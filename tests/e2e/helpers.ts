import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** Instant, reliable mock server unless a test asks for failures. Locale/theme set before the app boots. */
export async function openApp(page: Page, path: string, opts: { locale?: 'en' | 'ar'; theme?: 'light' | 'dark' } = {}) {
  await page.addInitScript(
    ({ locale, theme }) => {
      if (locale) localStorage.setItem('apex.locale', locale)
      if (theme) localStorage.setItem('apex.theme', theme)
    },
    { locale: opts.locale, theme: opts.theme },
  )
  const sep = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${sep}latency=none`)
}

/** WCAG 2.2 AA + best-practice scan of the current state; fails the test with a readable list. */
export async function expectNoA11yViolations(page: Page) {
  // Scan a settled page: mid-load states (skeletons, list dimmed to 60% while refetching)
  // are transitional and would make the result depend on timing.
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
  expect(summary, 'axe violations').toEqual([])
}

/** Keyboard-only activation: move focus with the keyboard API, never click. */
export async function pressOn(page: Page, locator: ReturnType<Page['locator']>, key = 'Enter') {
  await locator.focus()
  await expect(locator).toBeFocused()
  await page.keyboard.press(key)
}
