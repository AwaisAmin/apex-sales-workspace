// Records the README's reviewer demo as a silent video with on-screen captions.
// Usage: npm run build && npm run preview   (then, in another terminal)   npm run demo:video
// Output: docs/demo/apex-sales-demo.webm
import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT_DIR = 'docs/demo'
const SIZE = { width: 1280, height: 800 }

/** Caption bar rendered as a manual popover, so it sits in the top layer above open dialogs. */
async function caption(page, title, detail = '', holdMs = 2200) {
  await page.evaluate(
    ({ title, detail }) => {
      let el = document.getElementById('demo-caption')
      if (!el) {
        el = document.createElement('div')
        el.id = 'demo-caption'
        el.setAttribute('popover', 'manual')
        el.style.cssText = [
          'inset: auto 0 24px 0',
          'margin: 0 auto',
          'width: min(920px, calc(100% - 48px))',
          'padding: 14px 20px',
          'border: 0',
          'border-radius: 12px',
          'background: rgb(17 24 39 / 0.92)',
          'color: #fff',
          'font: 500 18px/1.4 system-ui, sans-serif',
          'direction: ltr',
          'text-align: left',
          'box-shadow: 0 8px 30px rgb(0 0 0 / 0.35)',
          'pointer-events: none',
        ].join(';')
        document.body.append(el)
      }
      el.innerHTML = `<div style="font-weight:700">${title}</div>${detail ? `<div style="opacity:.85;font-size:15px;margin-top:2px">${detail}</div>` : ''}`
      // Re-show so it moves to the top of the top layer (above a dialog opened after it).
      if (el.matches(':popover-open')) el.hidePopover()
      el.showPopover()
    },
    { title, detail },
  )
  await page.waitForTimeout(holdMs)
}

const pause = (page, ms = 1200) => page.waitForTimeout(ms)
const drawer = (page) => page.locator('dialog[open]').first()

mkdirSync(OUT_DIR, { recursive: true })
const tmp = join(OUT_DIR, '.raw')
rmSync(tmp, { recursive: true, force: true })

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'chrome',
  slowMo: 120,
})
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: tmp, size: SIZE } })
// Start every run from a clean slate: English, light theme, rep role, no injected faults.
await context.addInitScript(() => {
  if (sessionStorage.getItem('demo-init')) return
  sessionStorage.setItem('demo-init', '1')
  localStorage.clear()
  localStorage.setItem('apex.theme', 'light')
})
const page = await context.newPage()

// ── 0. Intro ────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/leads`)
await page.locator('tbody tr').first().waitFor()
await caption(
  page,
  'Apex Sales — AI-assisted sales workspace',
  'Frontend prototype · mock API (MSW) · synthetic data only',
  3200,
)

// ── 1. Lists: filter, sort, paginate, URL state ─────────────────────────────
await caption(page, '1 · Leads list', 'Filter by status, sort by column, paginate — all state is kept in the URL')
await page.getByRole('checkbox', { name: 'Qualified', exact: true }).click({ force: true })
await pause(page)
await page.getByRole('button', { name: 'Score', exact: true }).click()
await pause(page)
await page.getByRole('button', { name: 'Next page' }).click()
await pause(page, 1600)
await page.getByRole('button', { name: 'Clear filters' }).first().click()
await pause(page)

// ── 2. AI suggestion: grounded, confidence, limitations ─────────────────────
await page.goto(`${BASE}/leads`)
await page.locator('a[href="?lead=lead-001"]').first().click()
const card = page.getByTestId('suggestion-card')
await card.waitFor()
await card.scrollIntoViewIfNeeded()
await caption(
  page,
  '2 · AI suggestion — a proposal, not an applied change',
  'Confidence band · reasoning · limitations · cited evidence',
  3000,
)
await card.getByRole('link', { name: 'Show in timeline' }).first().click()
await caption(page, 'Evidence link → jumps to the cited activity', 'Users can verify what the suggestion is based on')

// ── 3. Human approval gate ──────────────────────────────────────────────────
await card.scrollIntoViewIfNeeded()
await card.getByRole('button', { name: 'Review & apply…' }).click()
await caption(page, '3 · Human approval gate', 'Exact before → after · focus starts on Cancel · audit note', 3000)
await page.keyboard.press('Escape')
await caption(page, 'Cancel → nothing is written', 'The drawer stays open; focus returns to “Review & apply…”')
await card.getByRole('button', { name: 'Review & apply…' }).click()
await pause(page, 800)
await page.getByRole('button', { name: 'Approve & apply' }).click()
await page.getByText('Change applied and logged in the audit trail.').waitFor()
await caption(
  page,
  'Approved → one write, confirmed by the server',
  'Status is now Qualified; the suggestion is consumed',
)
await drawer(page).getByTestId('audit-history').scrollIntoViewIfNeeded()
await caption(page, 'Audit trail', 'Recorded as “Applied from AI suggestion”, with the approving user')
await page.keyboard.press('Escape')

// ── 4. Low confidence needs acknowledgement ─────────────────────────────────
await page.goto(`${BASE}/leads?lead=lead-044`)
const lowCard = page.getByTestId('suggestion-card')
await lowCard.waitFor()
await lowCard.scrollIntoViewIfNeeded()
await caption(
  page,
  '4 · Low-confidence suggestion (48 %)',
  'Conflicting signals are shown as limitations and lower the confidence',
)
await lowCard.getByRole('button', { name: 'Review & apply…' }).click()
await caption(page, 'Approve is disabled until the user confirms they reviewed the evidence')
await page.getByRole('checkbox', { name: /reviewed the evidence/ }).check()
await pause(page, 1400)
await page.getByRole('button', { name: 'Cancel' }).click()
await page.keyboard.press('Escape')

// ── 5. Roles ────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/leads`)
await page.locator('header select').selectOption('u-view')
await pause(page, 800)
await page.goto(`${BASE}/leads?lead=lead-002`)
const viewerCard = page.getByTestId('suggestion-card')
await viewerCard.waitFor()
await viewerCard.scrollIntoViewIfNeeded()
await caption(
  page,
  '5 · Read-only role',
  'Viewers can read suggestions but not apply them — the API also returns 403',
  3000,
)
await page.keyboard.press('Escape')
await page.locator('header select').selectOption('u-rep')
await pause(page, 800)

// ── 6. Arabic, RTL, theme ───────────────────────────────────────────────────
await page.getByRole('button', { name: 'العربية' }).click()
await page.locator('html[dir="rtl"]').waitFor()
await caption(
  page,
  '6 · Arabic with full RTL layout',
  'Arabic-Indic digits · ر.س currency · Gregorian dates · mirrored layout',
  3000,
)
await page.goto(`${BASE}/leads?lead=lead-002`)
await page.getByTestId('suggestion-card').waitFor()
await caption(page, 'AI assistant in Arabic', 'Drawer opens from the inline end (left in RTL)')
await page.keyboard.press('Escape')
await page.getByRole('radio', { name: 'داكن' }).check({ force: true })
await caption(page, 'Dark theme', 'System / Light / Dark — all colour pairs pass WCAG AA contrast')
await page.getByRole('radio', { name: 'فاتح' }).check({ force: true })
await page.getByRole('button', { name: 'English' }).click()
await page.locator('html[dir="ltr"]').waitFor()

// ── 7. Resilience ───────────────────────────────────────────────────────────
const demoPanel = page.getByTestId('demo-controls')
await demoPanel.scrollIntoViewIfNeeded()
await demoPanel.locator('summary').click()
await caption(
  page,
  '7 · Resilience — demo controls inject server failures',
  'Latency, random failures, failing reads, failing saves',
)
await demoPanel.getByLabel('Fail every request').selectOption('500')
await page.getByRole('link', { name: 'Opportunities', exact: true }).click()
await caption(page, 'Server down: reads are retried automatically (3× with backoff)…', '', 1000)
await page.getByRole('alert').filter({ hasText: 'The server had a problem' }).waitFor({ timeout: 20_000 })
await caption(page, '…then a clear error with “Try again”', 'Writes are never retried automatically')
await demoPanel.getByLabel('Fail every request').selectOption('')
await page.getByRole('button', { name: 'Try again' }).click()
await page.locator('tbody tr').first().waitFor()
await caption(page, 'Recovered')

await page.getByRole('link', { name: 'Leads', exact: true }).click()
await demoPanel.getByLabel('Fail saves only').selectOption('500')
await page.goto(`${BASE}/leads?lead=lead-003`)
await drawer(page).getByTestId('status-control').scrollIntoViewIfNeeded()
await caption(
  page,
  'Optimistic update with rollback',
  'Saves are failing — watch the status change, then roll back',
  1800,
)
await drawer(page)
  .getByRole('button', { name: /Mark as/ })
  .first()
  .click()
await drawer(page).getByTestId('status-rollback').waitFor()
await caption(page, 'Rolled back, with the reason', 'The UI never pretends a failed save succeeded', 2800)
await page.keyboard.press('Escape')
// The reload above re-rendered the demo panel collapsed; open it again to clear the fault.
if (!(await demoPanel.evaluate((el) => el.open))) await demoPanel.locator('summary').click()
await demoPanel.getByLabel('Fail saves only').selectOption('')

await page.goto(`${BASE}/leads?lead=lead-003`)
await drawer(page).getByRole('button', { name: 'Simulate another user editing the open record' }).click()
await drawer(page).getByTestId('status-control').scrollIntoViewIfNeeded()
await caption(
  page,
  'Concurrent edit',
  'Another user changed this lead — our next save is based on a stale version',
  2000,
)
await drawer(page)
  .getByRole('button', { name: /Mark as/ })
  .first()
  .click()
await drawer(page).getByTestId('status-rollback').waitFor()
await caption(page, '409 conflict → rolled back, record refreshed', '', 2400)
await drawer(page)
  .getByRole('button', { name: /Mark as/ })
  .first()
  .click()
await page.getByText(/Status changed to/).waitFor()
await caption(page, 'Retry on the latest version succeeds')
await page.keyboard.press('Escape')

// ── Outro ───────────────────────────────────────────────────────────────────
await caption(
  page,
  'Thanks for watching',
  'Tests: 53 unit/component · 30 Playwright E2E · axe on every screen — see README and docs/',
  3500,
)

const video = page.video()
await context.close()
await browser.close()
const target = join(OUT_DIR, 'apex-sales-demo.webm')
rmSync(target, { force: true })
renameSync(await video.path(), target)
rmSync(tmp, { recursive: true, force: true })
console.log(`Saved ${target}`)
