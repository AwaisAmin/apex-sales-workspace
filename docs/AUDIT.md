# Performance and accessibility audit

Measured on the **production build** (`npm run build && npm run preview`). Every number below comes from a script in
this repository and can be reproduced; raw results are in [`docs/evidence`](evidence).

**Environment:** Windows 11 · Intel Core i7-13650HX · 16 GB · Google Chrome 156 · Node 24.14 · Lighthouse 12.8.2 ·
axe-core 4.14 · date 2026-10-29.

## Summary

| Area                   | Result                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Lighthouse performance | **100** desktop / **96–97** mobile on the leads list (median of 3)                                      |
| Core Web Vitals (lab)  | LCP 0.47 s desktop, 2.11 s mobile (Slow 4G, 4× CPU) · CLS ≤ 0.02 · TBT ≤ 27 ms — all "good"             |
| Interaction latency    | 9–53 ms at normal CPU; **≤ 405 ms median at 4× CPU throttling** (opening a lead with its AI suggestion) |
| Accessibility          | Lighthouse 100 on every page · **0 axe violations** across 24 automated states · 48/48 contrast checks  |
| JavaScript             | App 148 KB gzip (128 KB brotli) · mock API layer 37 KB gzip, loaded as a separate chunk                 |

The audit found five measurable problems; all five were fixed and re-measured:

| Problem found                                                                                         | Fix                                                                       | Before → after                                                                                          |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Page shifts sideways when the scrollbar appears (desktop)                                             | `scrollbar-gutter: stable`                                                | CLS **0.124 → 0.014** (leads, desktop)                                                                  |
| Role `<select>` grows when its options arrive, pushing the page down                                  | Fixed width                                                               | part of the CLS above (header shift 0.003 → 0)                                                          |
| Mock layer pulled a 255 KB public-suffix list via MSW's cookie code                                   | Alias `tough-cookie` to an empty jar (no cookies are used)                | mock chunk **158.9 → 37.8 KB gzip** (−76 %); page weight **313 → 196 KB**; mobile LCP **2.75 → 2.11 s** |
| Header `backdrop-filter` and a root-level `:has()` made every DOM change expensive to repaint/restyle | Solid header; `html[data-modal-open]` instead of `html:has(dialog[open])` | 4× CPU, open drawer: 599 → 381 ms (blur) / 470 ms (`:has`) in isolation                                 |
| Drawer waited one extra round-trip before the AI panel could load                                     | Seed the drawer from the list cache; fetch suggestions in parallel        | 4× CPU, open drawer → suggestion shown: **825 → 405 ms** (median)                                       |

---

## 1. Lighthouse

`node scripts/lighthouse.mjs <url> 3 <mode>` — 3 runs per cell, **median** reported. Desktop preset and Lighthouse's
default mobile emulation (Moto G Power, Slow 4G, 4× CPU).

Two modes, because the mock API adds an **artificial 250–800 ms latency** to every request on purpose (so loading
states are visible in the demo):

- **simulated** — what a reviewer experiences, including that fake delay.
- **app-only** — `?latency=none`, isolating the frontend's own cost.

### App-only (frontend cost)

| Page                  | Preset  | Perf | A11y | Best pr. | FCP    | LCP    | TBT   | CLS   |
| --------------------- | ------- | ---- | ---- | -------- | ------ | ------ | ----- | ----- |
| Leads (en)            | desktop | 100  | 100  | 100      | 0.43 s | 0.51 s | 0 ms  | 0.019 |
| Leads (ar)            | desktop | 100  | 100  | 100      | 0.47 s | 0.54 s | 0 ms  | 0.019 |
| Lead drawer + AI (en) | desktop | 99   | 100  | 100      | 0.47 s | 0.62 s | 0 ms  | 0.060 |
| Leads (en)            | mobile  | 97   | 100  | 100      | 1.98 s | 2.17 s | 27 ms | 0.001 |
| Leads (ar)            | mobile  | 96   | 100  | 100      | 2.12 s | 2.29 s | 20 ms | 0     |
| Lead drawer + AI (en) | mobile  | 96   | 100  | 100      | 2.01 s | 2.35 s | 28 ms | 0.022 |

### Simulated (includes the mock's 250–800 ms artificial latency)

| Page                  | Preset  | Perf | FCP    | LCP    | TBT   | CLS   |
| --------------------- | ------- | ---- | ------ | ------ | ----- | ----- |
| Leads (en)            | desktop | 100  | 0.44 s | 0.47 s | 0 ms  | 0.014 |
| Leads (ar)            | desktop | 100  | 0.49 s | 0.51 s | 0 ms  | 0.016 |
| Lead drawer + AI (en) | desktop | 88   | 1.34 s | 1.54 s | 0 ms  | 0.079 |
| Leads (en)            | mobile  | 97   | 1.96 s | 2.11 s | 25 ms | 0.001 |
| Leads (ar)            | mobile  | 96   | 2.14 s | 2.30 s | 22 ms | 0     |
| Lead drawer + AI (en) | mobile  | 86   | 3.01 s | 3.36 s | 40 ms | 0.066 |

**Reading the drawer row:** the drawer issues seven API calls through the service worker, each delayed by the mock.
Lighthouse's simulated throttling counts them as paint dependencies. In real Chrome without throttling the same URL
paints first content at **228 ms** (`performance.getEntriesByType('paint')`), faster than the list (476 ms) — the
1.34 s is the mock's deliberate delay, not render cost. App-only mode confirms this (99 desktop).

### Before the fixes (baseline, simulated — [`lighthouse-baseline.json`](evidence/lighthouse-baseline.json))

| Page       | Preset  | Perf | LCP        | CLS       | Transfer |
| ---------- | ------- | ---- | ---------- | --------- | -------- |
| Leads (en) | desktop | 96   | 0.58 s     | **0.124** | 313 KB   |
| Leads (ar) | desktop | 95   | 0.64 s     | **0.133** | 313 KB   |
| Leads (en) | mobile  | 93   | **2.75 s** | 0.001     | 313 KB   |
| Drawer     | mobile  | 81   | 3.86 s     | 0.066     | 313 KB   |

## 2. Interaction latency

`node scripts/perf-interactions.mjs` — Playwright drives the production build with the mock delay off. Time is measured
from the action to the first animation frame where the result is on screen. 5 repetitions; median (max). Long tasks =
main-thread tasks > 50 ms during the interaction, summed over the 5 runs.

| Interaction                                  | 1× CPU     | 4× CPU           | Long tasks (4×) |
| -------------------------------------------- | ---------- | ---------------- | --------------- |
| Sort by a column (refetch + re-render)       | 22 ms (27) | 294 ms (389)     | 7               |
| Next page (prefetched)                       | 11 ms (19) | 157 ms (191)     | 5               |
| Toggle a status filter (refetch)             | 24 ms (35) | 341 ms (489)     | 9               |
| Open a lead → AI suggestion visible          | 41 ms (70) | **405 ms** (976) | 8               |
| Switch language EN → AR (full RTL re-render) | 9 ms (12)  | 136 ms (333)     | 10              |

At normal CPU every interaction is well inside the 200 ms INP "good" threshold. At 4× throttling, interactions that
refetch land at 300–400 ms. A CPU profile of the drawer at 4× attributes most of the time to style/layout/paint
("program", 733 ms of samples) rather than JavaScript (app 124 ms, mock backend 26 ms) — which is what led to the
`backdrop-filter` and `:has()` fixes. Note that in this prototype the mock backend runs on the page's main thread; with
a real API that work disappears.

## 3. Bundle

Measured from source maps (`source-map-explorer`) and compressed with Node's zlib.

| Chunk                     | Minified | gzip    | brotli  | Loaded                              |
| ------------------------- | -------- | ------- | ------- | ----------------------------------- |
| App (`index-*.js`)        | 496 KB   | 148 KB  | 128 KB  | immediately                         |
| Mock API (`browser-*.js`) | 114 KB   | 36.5 KB | 31.8 KB | dynamic import, before first render |
| CSS                       | 32 KB    | 7.5 KB  | 6.6 KB  | immediately                         |
| Fonts                     | —        | —       | —       | per script via `unicode-range`      |

App chunk composition: react-dom 41 % · zod 18 % · app source 16 % · i18next 9 % · TanStack Query 6 % ·
tailwind-merge 5 % · react 2 %. React Query Devtools is excluded from production (verified absent).

Largest remaining opportunities (see the roadmap in [DECISIONS.md](DECISIONS.md)):

- **zod → `zod/mini`** (88 KB minified today) — tree-shakable functional API; the main lever left.
- **Lazy-load the inactive locale** (messages are 15 KB of the 80 KB app source).
- **Render one list layout**: desktop table and mobile cards are both rendered, one hidden by CSS — doubling list
  render work on every update.

## 4. Accessibility

| Check                                         | Result                                                                                | Evidence                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| axe (WCAG 2.2 AA + best practice), Playwright | **0 violations** — 3 screens × ar/en × light/dark × desktop/mobile = 24 states        | `tests/e2e/accessibility.spec.ts`, [`e2e-run.txt`](evidence/e2e-run.txt) |
| Lighthouse accessibility                      | 100 on every audited page                                                             | `lighthouse-*.json`                                                      |
| Token contrast                                | 48/48 pairs pass AA in both themes; lowest 4.57:1 (text), 3.39:1 (control borders)    | `npm run audit:contrast`                                                 |
| Keyboard-only journey (Arabic)                | Full AI-approval flow without a mouse, automated                                      | `journey-ai-approval-ar-keyboard.spec.ts`                                |
| Focus management                              | Focus returns to the opener, or to a stable heading / `<main>` if it vanished; tested | unit + E2E                                                               |
| Reflow at 320 px                              | No horizontal scrolling, ar and en                                                    | [`accessibility-pass.md`](evidence/accessibility-pass.md)                |
| Localisation correctness                      | No Latin digits in the Arabic drawer (outside `dir="ltr"` data)                       | E2E assertion                                                            |

Issues found by these checks and fixed: AI button text at **1.85:1** in dark mode (found by the contrast script, not by
axe); danger button 2.77:1; form-control borders 1.36:1; focus lost after a status change, after approving a suggestion,
and when the opener left a filtered list; toasts not announced inside modals; Latin digit in Arabic text.

## 5. Caveats

- Lab measurements on one fast machine; field data (CrUX/RUM) does not exist for a prototype.
- Lighthouse scores vary run to run; medians of 3 are reported, and the 4× interaction numbers have a wide max.
- The mock API runs in the browser (service worker + main thread), so it inflates load and interaction cost compared
  with a real backend.
- Not verified: screen readers (NVDA/VoiceOver), Windows forced-colours mode, real low-end Android hardware.
- During one of ~10 E2E runs, a single navigation was aborted (`net::ERR_ABORTED`) while a preview server was being
  reused; it did not recur in the following runs.

## Reproduce

```bash
npm run build && npm run preview                 # terminal 1
node scripts/lighthouse.mjs http://localhost:4173 3 app-only
node scripts/lighthouse.mjs http://localhost:4173 3 simulated
node scripts/perf-interactions.mjs
npm run audit:contrast && npm run test:e2e
```
