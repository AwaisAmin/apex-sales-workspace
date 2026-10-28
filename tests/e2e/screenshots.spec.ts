import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

/*
 * Generates the deliverable screenshots (Arabic + English, desktop + mobile) into docs/screenshots.
 * Tagged @screenshots and excluded from the normal E2E run: `npm run e2e:screenshots`.
 */
const out = (project: string, name: string) => `docs/screenshots/${project}-${name}.png`

for (const locale of ['en', 'ar'] as const) {
  test(`@screenshots ${locale}`, async ({ page }, info) => {
    const p = info.project.name

    await openApp(page, '/leads', { locale, theme: 'light' })
    await expect(page.locator('tbody tr, ul li').filter({ visible: true }).nth(3)).toBeVisible()
    await page.screenshot({ path: out(p, `${locale}-1-leads`) })

    await page.goto('/leads?lead=lead-001&latency=none')
    await expect(page.getByTestId('suggestion-card')).toBeVisible()
    await page.screenshot({ path: out(p, `${locale}-2-lead-ai-suggestion`) })

    await page.getByTestId('suggestion-card').getByRole('button').last().click()
    await expect(page.getByTestId('approve-apply')).toBeVisible()
    await page.screenshot({ path: out(p, `${locale}-3-approval-dialog`) })

    await page.goto('/opportunities?latency=none')
    await expect(page.locator('tbody tr, ul li').filter({ visible: true }).nth(3)).toBeVisible()
    await page.screenshot({ path: out(p, `${locale}-4-opportunities`) })

    await openApp(page, '/leads?lead=lead-044', { locale, theme: 'dark' })
    await expect(page.getByTestId('suggestion-card')).toBeVisible()
    await page.screenshot({ path: out(p, `${locale}-5-dark-low-confidence`) })
  })
}
