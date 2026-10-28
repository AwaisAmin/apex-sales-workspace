import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

/*
 * Journey 2 — API resilience, driven through the in-app demo controls.
 * Server down → automatic retries → error state → recovery; a failed save rolls back;
 * a concurrent edit produces a 409 that rolls back and then succeeds on retry.
 */
async function demo(page: Page, control: 'Fail every request' | 'Fail saves only', value: '' | '500') {
  const panel = page.getByTestId('demo-controls')
  if (!(await panel.evaluate((d) => (d as HTMLDetailsElement).open))) await panel.locator('summary').click()
  await panel.getByLabel(control).selectOption(value)
}

const currentStep = (page: Page) => page.getByRole('dialog').locator('[aria-current="step"]')

test('the UI stays truthful through outages, failed saves and conflicts', async ({ page }) => {
  // 1. Every request fails: reads are retried automatically, then a clear error with recovery.
  await openApp(page, '/leads?fail=500')
  const alert = page.getByRole('alert').filter({ hasText: 'The server had a problem' })
  await expect(alert).toBeVisible({ timeout: 15_000 }) // 1 attempt + 3 backoff retries
  await expect(alert).toContainText('We retried automatically')

  await demo(page, 'Fail every request', '')
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('120 leads')).toBeVisible()

  // 2. Saves fail: the optimistic change is shown, then rolled back with an explanation.
  await demo(page, 'Fail saves only', '500')
  await page.locator('a[href="?lead=lead-001"]').filter({ visible: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Tuwaiq Contracting' })
  await expect(currentStep(page)).toHaveText(/Contacted/)

  await drawer.getByRole('button', { name: 'Mark as Qualified' }).click()
  await expect(drawer.getByTestId('status-rollback')).toContainText('Your change was undone')
  await expect(currentStep(page)).toHaveText(/Contacted/)

  // Close the drawer to reach the demo panel (the page behind a modal is inert), stop failing saves.
  await page.keyboard.press('Escape')
  await demo(page, 'Fail saves only', '')

  // 3. Another user edits the lead → our save conflicts (409), rolls back, and the record refreshes.
  await page.locator('a[href="?lead=lead-001"]').filter({ visible: true }).click()
  await drawer.getByRole('button', { name: 'Simulate another user editing the open record' }).click()
  await expect(page.getByText('Record changed in another session')).toBeVisible()

  await drawer.getByRole('button', { name: 'Mark as Qualified' }).click()
  await expect(drawer.getByTestId('status-rollback')).toContainText('Someone else changed this record')
  await expect(currentStep(page)).toHaveText(/Contacted/)
  await expect(drawer.getByTestId('audit-history')).toContainText('edited in another session')

  // 4. Retrying on the refreshed version succeeds, and the list behind reflects it.
  await drawer.getByRole('button', { name: 'Mark as Qualified' }).click()
  await expect(page.getByText('Status changed to Qualified.')).toBeVisible()
  await expect(currentStep(page)).toHaveText(/Qualified/)
  await page.keyboard.press('Escape')
  await expect(
    page
      .locator('a[href="?lead=lead-001"]')
      .filter({ visible: true })
      .locator('xpath=ancestor::*[self::tr or self::li][1]'),
  ).toContainText('Qualified')
})
