import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, openApp, pressOn } from './helpers'

/*
 * Journey 1 — Arabic, RTL, keyboard only (no mouse clicks).
 * A sales rep filters leads, opens one, reviews the AI suggestion's evidence, backs out once,
 * then approves it; the change is applied exactly once and recorded in the audit trail.
 */
test('Arabic keyboard-only user reviews and approves an AI suggestion', async ({ page }) => {
  await openApp(page, '/leads')

  // Switch to Arabic with the keyboard; the whole document flips to RTL.
  await pressOn(page, page.getByRole('button', { name: 'العربية' }))
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('heading', { level: 1, name: 'العملاء المحتملون' })).toBeVisible()

  // Filter by status with Space on the checkbox chip; the filter lands in the URL.
  await pressOn(page, page.getByRole('checkbox', { name: 'تم التواصل' }), 'Space')
  await expect(page).toHaveURL(/status=contacted/)

  // Open the lead with Enter on its link.
  await pressOn(page, page.locator('a[href="?lead=lead-001"]').filter({ visible: true }))
  const drawer = page.getByRole('dialog', { name: 'طويق للمقاولات' })
  await expect(drawer).toBeVisible()

  // The suggestion is clearly a proposal, with confidence, evidence and limitations.
  const card = drawer.getByTestId('suggestion-card')
  await expect(card).toContainText('غير مطبّق') // "not applied"
  await expect(card).toContainText('ثقة متوسطة') // medium confidence
  await expect(card.getByRole('link', { name: 'عرض في السجل' }).first()).toBeVisible()

  // Every number in the Arabic UI is localized (Arabic-Indic digits). Only intentionally-LTR
  // content (phone, email, model id, raw audit summary — all marked dir="ltr") may contain 0–9.
  const latinDigits = await drawer.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement
    copy.querySelectorAll('[dir="ltr"]').forEach((n) => n.remove())
    return copy.textContent?.match(/[0-9]+/g) ?? []
  })
  expect(latinDigits, 'Latin digits in Arabic UI').toEqual([])

  // Evidence link moves focus to the cited activity in the timeline.
  await pressOn(page, card.getByRole('link', { name: 'عرض في السجل' }).first())
  await expect(page.locator('li[id^="activity-"]:focus')).toHaveCount(1)

  // Open the approval gate: focus starts on Cancel (safe default). Escape backs out — nothing changes.
  const review = card.getByRole('button', { name: 'مراجعة وتطبيق…' })
  await pressOn(page, review)
  const approval = page.getByRole('dialog', { name: 'تطبيق اقتراح الذكاء الاصطناعي؟' })
  await expect(approval.getByRole('button', { name: 'إلغاء' })).toBeFocused()
  await expect(approval).toContainText('قبل')
  await expect(approval).toContainText('بعد')
  await page.keyboard.press('Escape')
  await expect(approval).toBeHidden()
  await expect(drawer).toBeVisible() // only the approval dialog closed
  await expect(review).toBeFocused() // focus returned to the opener
  await expect(
    drawer.getByTestId('status-control').getByRole('listitem').and(page.locator('[aria-current="step"]')),
  ).toHaveText(/تم التواصل/)

  // Approve for real: Enter on Review, Tab from Cancel to Approve, Enter.
  await page.keyboard.press('Enter')
  await expect(approval.getByRole('button', { name: 'إلغاء' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(approval.getByRole('button', { name: 'اعتماد وتطبيق' })).toBeFocused()

  const writes: string[] = []
  page.on(
    'request',
    (r) =>
      r.method() !== 'GET' && r.url().includes('/api/') && writes.push(`${r.method()} ${new URL(r.url()).pathname}`),
  )
  await page.keyboard.press('Enter')

  await expect(page.getByText('تم تطبيق التغيير وتسجيله في سجل التدقيق.')).toBeVisible()
  await expect(approval).toBeHidden()
  // The card that held the Review button is gone; focus lands on the AI assistant heading, not <body>.
  await expect(drawer.getByRole('heading', { name: 'مساعد الذكاء الاصطناعي' })).toBeFocused()
  await expect(drawer.locator('[aria-current="step"]')).toHaveText(/مؤهل/) // now Qualified
  await expect(drawer.getByTestId('audit-history')).toContainText('تم التطبيق من اقتراح الذكاء الاصطناعي')
  await expect(drawer.getByTestId('assistant-panel')).toContainText('لا توجد اقتراحات') // suggestion consumed
  expect(writes).toEqual(['PATCH /api/leads/lead-001/status'])

  // The drawer state (RTL, AI content, history) is accessible.
  await expectNoA11yViolations(page)

  // Escape closes the drawer. The lead is now "Qualified", so it left the "Contacted" list and the
  // link that opened the drawer no longer exists: focus must land on <main>, not be lost to <body>.
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page.locator('a[href="?lead=lead-001"]')).toHaveCount(0)
  await expect(page.locator('main')).toBeFocused()
})
