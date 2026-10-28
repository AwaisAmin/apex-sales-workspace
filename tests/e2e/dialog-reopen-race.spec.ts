import { expect, test } from '@playwright/test'
import { openApp, pressOn } from './helpers'

/*
 * Smoke test for rapid Escape → Enter in a real browser. Background: Escape closes the native dialog
 * at once but its `close` event arrives a task later; a re-open in that gap used to be swallowed by the
 * late event (seen once when a fresh clone ran the Arabic journey).
 * Playwright waits for each key press to be acknowledged, so this test does NOT reliably hit that gap —
 * it passed even with the fix removed. The race itself is covered deterministically in
 * src/features/assistant/approval.test.tsx ("a late native close event does not swallow a re-open").
 */
test('the approval dialog re-opens when Enter immediately follows Escape', async ({ page }) => {
  await openApp(page, '/leads?lead=lead-001')
  const review = page.getByRole('button', { name: 'Review & apply…' })
  const approval = page.getByRole('dialog', { name: 'Apply AI suggestion?' })

  await pressOn(page, review)
  await expect(approval.getByRole('button', { name: 'Cancel' })).toBeFocused()

  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Escape')
    await page.keyboard.press('Enter') // focus is back on "Review & apply…"
    await expect(approval, `iteration ${i}`).toBeVisible()
    await expect(approval.getByRole('button', { name: 'Cancel' })).toBeFocused()
  }

  // And a plain Escape still closes it, leaving the drawer open.
  await page.keyboard.press('Escape')
  await expect(approval).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Tuwaiq Contracting' })).toBeVisible()
  await expect(review).toBeFocused()
})
