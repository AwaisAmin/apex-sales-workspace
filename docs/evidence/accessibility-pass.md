# Accessibility pass — raw evidence

Date: 2026-10-29 · Build: Vite dev server, Chrome (desktop) · axe-core 4.14.0
Rule tags: `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`

## 1. Automated scan (axe-core, run in the live app)

| State | Locale | Theme | Violations | Rules passed |
|---|---|---|---|---|
| /leads list | en | dark | 0 | 48 |
| /opportunities list | en | dark | 0 | — |
| Lead drawer (lead-001, with AI suggestion) | en | dark | 0 | 28 |
| Approval dialog open | en | dark | 0 | 20 |
| Lead drawer | ar | dark | 0 | 28 |
| /leads list | ar | dark | 0 | 48 |
| /leads list | ar | light | 0 | 48 |
| Lead drawer | ar | light | 0 | 28 |

With a modal open, axe correctly excludes the inert page behind it, hence fewer rules on drawer/dialog states.
"Incomplete" (needs manual review) was empty in every state.

**Limitation:** automated tools catch roughly a third of WCAG issues. Sections 2–4 are manual checks, and section 5
lists an issue axe did *not* report.

## 2. Colour contrast (tokens) — `npm run audit:contrast`

23 foreground/background pairs × 2 themes = 46 checks, all pass WCAG 2.1 AA (text ≥ 4.5:1, UI boundaries/focus ≥ 3:1).
Lowest values: light `success on success-bg` 4.57:1, light `warning on warning-bg` 4.58:1 (both AA, close to the line —
see roadmap), dark `border-strong on surface` 3.39:1.

## 3. Keyboard-only journey (real key presses)

Tab order from page load:
1. Skip to main content → 2. Leads → 3. Opportunities → 4. Role select → 5. Language → 6. Search →
7–10. Status chips (checkboxes) → 11. City select → 12+. Sortable column headers → company links → pagination.

Focus ring visible on every stop (computed `outline` checked per element).

| Check | Result |
|---|---|
| Skip link + Enter | focus moves to `<main>` |
| Enter on company link | drawer opens, focus on Close button |
| Escape in drawer | drawer closes, focus returns to the same company link, `?lead` removed from URL |
| Review & apply (real click) | approval dialog opens with focus on **Cancel** |
| Escape in approval dialog | only the approval dialog closes; focus returns to "Review & apply…" |
| Status change via Enter | focus moves to the "Status" heading (the pressed button is removed by the update) |
| Shift+Tab from first drawer control | focus leaves to browser chrome — native `<dialog>` behaviour, not a trap |

## 4. Reflow at 320 px (WCAG 1.4.10)

| Page | en scrollWidth | ar scrollWidth | Viewport |
|---|---|---|---|
| /leads | 305 | 305 | 320 (15 px scrollbar) |
| /opportunities | 305 | 305 | 320 |
| Lead drawer | 319 (drawer) | 319 (drawer) | 320 |

No horizontal scrolling in either direction.

## 5. Issues found and fixed during this pass

| Issue | Found by | Before | After |
|---|---|---|---|
| "Review & apply" (AI) button text in dark mode | contrast script — **not reported by axe** | white on #c4b5fd = **1.85:1** | `--color-ai-fg` #1e1033 = 9.66:1 |
| Danger button / toast text in dark mode | contrast script | white on #f87171 = 2.77:1 | `--color-danger-fg` = 7.02:1 |
| Input/select boundaries (WCAG 1.4.11) | contrast script | border 1.36:1 | `--color-border-strong` 3.39–3.70:1 |
| Focus lost after status change | manual keyboard test (Step 10) | focus fell to `<body>` | focus moves to section heading |
| Escape closed drawer + dialog together | manual test (Step 9) | React propagated nested `close` | handlers ignore events from child dialogs |

## 6. Not yet tested (honest gaps)

- **Screen reader** (NVDA/JAWS/VoiceOver) — semantics are checked via axe and code review only.
- **prefers-reduced-motion** — implemented (`motion-reduce:` classes, `--duration-fast: 0ms`) but not emulated in a browser.
- **Windows High Contrast / forced-colors** mode.
- 200% browser zoom on desktop (320 px reflow covers the equivalent of 400% zoom for widths).
