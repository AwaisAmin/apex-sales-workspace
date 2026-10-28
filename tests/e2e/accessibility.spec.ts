import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, openApp } from './helpers'

/** axe scan of every main screen in both languages and both themes (runs on desktop and mobile projects). */
for (const locale of ['en', 'ar'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${locale} / ${theme}`, () => {
      test('leads list', async ({ page }) => {
        await openApp(page, '/leads', { locale, theme })
        await expect(page.locator('tbody tr, ul li').filter({ visible: true }).first()).toBeVisible()
        await expectNoA11yViolations(page)
      })

      test('opportunities list', async ({ page }) => {
        await openApp(page, '/opportunities', { locale, theme })
        await expect(page.locator('tbody tr, ul li').filter({ visible: true }).first()).toBeVisible()
        await expectNoA11yViolations(page)
      })

      test('lead drawer with AI suggestion', async ({ page }) => {
        await openApp(page, '/leads?lead=lead-001', { locale, theme })
        await expect(page.getByTestId('suggestion-card')).toBeVisible()
        await expectNoA11yViolations(page)
      })
    })
  }
}
