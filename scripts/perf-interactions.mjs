// Interaction latency of the production build: time from a user action to the next painted frame
// that shows the result. Mock latency is disabled (?latency=none) so only frontend cost is measured.
// Runs at 1× and 4× CPU throttling (≈ a mid-range Android phone), 5 repetitions each, reports median and max.
// Usage: npm run build && npm run preview  (then)  node scripts/perf-interactions.mjs [baseUrl]
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:4173'
const REPS = 5

/** Runs `act` inside the page, then resolves on the first animation frame where `done` is true. */
async function measure(page, act, done) {
  return page.evaluate(
    ({ act, done }) =>
      new Promise((resolve) => {
        const run = new Function(act)
        const check = new Function(`return (${done})`)
        const t0 = performance.now()
        run()
        const tick = () => (check() ? resolve(performance.now() - t0) : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
      }),
    { act, done },
  )
}

const firstCompany = `document.querySelector('tbody tr a')?.textContent`

const scenarios = [
  {
    name: 'Sort by score (list re-render)',
    setup: '/leads?latency=none',
    act: `window.__before = ${firstCompany}; [...document.querySelectorAll('th button')].find(b => b.textContent.startsWith('Score')).click()`,
    done: `${firstCompany} !== window.__before && !document.querySelector('[aria-busy="true"]')`,
  },
  {
    name: 'Next page (prefetched)',
    setup: '/leads?latency=none',
    act: `window.__before = ${firstCompany}; document.querySelector('[aria-label="Next page"]').click()`,
    done: `${firstCompany} !== window.__before`,
  },
  {
    name: 'Status filter chip',
    setup: '/leads?latency=none',
    act: `[...document.querySelectorAll('label')].find(l => l.textContent === 'Qualified').querySelector('input').click()`,
    done: `[...document.querySelectorAll('tbody tr')].every(r => r.textContent.includes('Qualified')) && !document.querySelector('[aria-busy="true"]')`,
  },
  {
    name: 'Open lead drawer → AI suggestion shown',
    setup: '/leads?latency=none',
    act: `document.querySelector('a[href="?lead=lead-001"]').click()`,
    done: `!!document.querySelector('dialog[open] [data-testid="suggestion-card"]')`,
  },
  {
    name: 'Switch language EN → AR (full re-render, RTL)',
    setup: '/leads?latency=none',
    act: `document.querySelector('[data-testid="language-switcher"]').click()`,
    done: `document.dir === 'rtl' && document.querySelector('h1')?.textContent === 'العملاء المحتملون'`,
  },
]

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'chrome' })
const results = []

for (const cpu of [1, 4]) {
  for (const s of scenarios) {
    const samples = []
    let longTasks = 0
    for (let i = 0; i < REPS; i++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await page.addInitScript(() => {
        window.__longTasks = 0
        new PerformanceObserver((l) => (window.__longTasks += l.getEntries().length)).observe({ type: 'longtask' })
      })
      await page.goto(base + s.setup)
      await page.waitForSelector('tbody tr a')
      await page.waitForLoadState('networkidle') // includes the next-page prefetch
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
      const before = await page.evaluate(() => window.__longTasks)
      samples.push(await measure(page, s.act, s.done))
      longTasks += (await page.evaluate(() => window.__longTasks)) - before
      await context.close()
    }
    const row = {
      cpu: `${cpu}×`,
      interaction: s.name,
      medianMs: Math.round(median(samples)),
      maxMs: Math.round(Math.max(...samples)),
      longTasks,
    }
    results.push(row)
    console.log(JSON.stringify(row))
  }
}
await browser.close()

mkdirSync('docs/evidence', { recursive: true })
writeFileSync(
  'docs/evidence/interactions.json',
  JSON.stringify({ date: new Date().toISOString(), base, repetitions: REPS, results }, null, 2),
)
