# Decision memo, trade-offs and 90-day roadmap

**Audience:** Apex AI Arabia engineering reviewers. **Scope:** the Apex Sales frontend prototype in this repository.
For how the pieces fit together see [ARCHITECTURE.md](ARCHITECTURE.md); for measurements see [AUDIT.md](AUDIT.md).

## 1. What was optimised for

The brief rewards working software with evidence over breadth. Priorities, in order:

1. **No AI action without explicit human approval** (critical red flag) — enforced in UI _and_ mock server, and tested.
2. **Arabic RTL and keyboard use as first-class**, not a final pass — automated in an Arabic keyboard-only E2E journey.
3. **Honest resilience** — the UI never shows data or success it does not have (stale results flagged, rollbacks
   explained, writes never silently retried).
4. **Verifiable claims** — every number in the docs comes from a script in the repo.

Breadth (more entities, dashboards, editing forms) was deliberately traded for depth on these four.

## 2. Key decisions

| Decision                                                                 | Alternatives considered               | Why this one                                                                                                      | Cost / risk accepted                                                       |
| ------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Vite SPA** (React 19, TS strict)                                       | Next.js                               | Authenticated internal workspace: no SEO or SSR need; simpler, faster builds                                      | No server rendering; first paint waits for JS                              |
| **MSW** as the mock backend                                              | json-server, hand-written fake client | Intercepts real `fetch`, so app code has no "mock mode"; the same handlers run in the browser, unit tests and E2E | Mock runs on the page's main thread; ships in the prototype build          |
| **Zod at the API boundary**                                              | TypeScript types only                 | Types and runtime validation cannot drift; contract breaks become a handled error                                 | 88 KB minified (largest optimisable dependency — roadmap)                  |
| **TanStack Query for server state; URL for view state; no global store** | Redux Toolkit / Zustand               | Caching, retry, optimistic updates built in; remaining global state is a handful of values                        | Team must learn query-key discipline                                       |
| **Optimistic manual edits, pessimistic AI applies**                      | One strategy everywhere               | User decisions deserve instant feedback; machine proposals must not look applied before the server agrees         | Two code paths to understand and test                                      |
| **Version numbers + 409** for concurrency                                | Last-write-wins                       | Prevents silently overwriting a colleague's change; also invalidates stale AI suggestions                         | Users occasionally see a conflict and must retry                           |
| **Closed union of AI-proposable changes** (3 fields)                     | Free-form patch from the model        | Every possible AI action is reviewable as before/after and individually authorised by the server                  | Each new AI capability needs a schema change                               |
| **Confidence shown as bands** (+ raw score)                              | Raw percentage only / no confidence   | Self-reported model scores are not calibrated; bands avoid false precision while staying transparent              | Thresholds (0.75 / 0.5) are a product guess until calibrated               |
| **Native `<dialog>`, `<select>`, checkboxes**                            | Headless UI library                   | Focus trap, inert background, keyboard and mobile pickers for free; fewer dependencies                            | Had to handle three real browser/React edge cases (documented, tested)     |
| **Tailwind v4 + semantic `light-dark()` tokens**                         | CSS-in-JS, separate dark stylesheet   | Logical properties make RTL automatic; one line per colour for both themes                                        | `light-dark()` needs 2024+ browsers                                        |
| **i18next with typed TS message objects**                                | FormatJS / ICU                        | Missing Arabic keys fail the build; native `Intl` covers formatting at 0 KB                                       | ~17 KB gzip; Arabic plurals handled with count-neutral copy, not ICU rules |
| **Tiny custom router**                                                   | React Router / TanStack Router        | Two routes; URL state was the real need                                                                           | No nested routes or loaders; revisit as routes grow                        |
| **Tests against real components + real mock pipeline**                   | Heavy mocking of hooks                | Tests break when behaviour breaks, not when internals change; safety tests validated by mutation                  | Slightly slower tests (still ≈ 3 s for 52)                                 |

## 3. Assumptions

- Lead and company names exist in both Arabic and English. Real CRM records may hold one language only; the UI would
  then need per-field language detection and `dir="auto"`.
- Business dates are Gregorian in both languages (Hijri as a later user preference).
- Roles: _rep_ and _manager_ may change records; _viewer_ is read-only. No per-record ownership rules yet.
- AI suggestions are generated server-side and delivered as data; the frontend never calls a model directly and treats
  suggestions as untrusted input.
- Synthetic data only; no personal data is processed.

## 4. Known risks

| Risk                                                    | Mitigation today                                         | Next step                                    |
| ------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| AI confidence is not calibrated                         | Bands + limitations + mandatory acknowledgement when low | Calibrate against outcome data (roadmap)     |
| Bilingual names assumption may not match real data      | Isolated in `LocalizedText`                              | Validate with real (anonymised) CRM exports  |
| Screen readers not verified                             | Native semantics, axe, keyboard E2E                      | NVDA + VoiceOver pass with an Arabic speaker |
| Arabic copy written without a native review             | Consistent terminology, typed keys                       | Native-speaker copy review                   |
| One unexplained service-worker pass-through seen in dev | Handled safely (`INVALID_RESPONSE`, retry)               | Disappears with a real API                   |

## 5. 90-day roadmap

### Days 1–30 — Make it real and safe to ship

- **Real API contract:** OpenAPI spec agreed with backend; generate Zod schemas/types from it; contract tests in CI.
- **Authentication:** OIDC with httpOnly session cookies, CSRF protection, session-expiry flow (UI already handles 401).
- **CI pipeline:** `npm run check` + Playwright on every PR; Lighthouse CI with budgets (LCP ≤ 2.5 s mobile, CLS ≤ 0.1,
  JS ≤ 150 KB gzip) and the contrast audit as required checks.
- **Observability:** error reporting (Sentry or equivalent), `web-vitals` RUM for real LCP/INP/CLS per locale.
- **Accessibility:** NVDA and VoiceOver pass in Arabic and English; Windows forced-colours check; native-speaker review
  of Arabic copy.
- **Compliance groundwork:** data-flow inventory for Saudi PDPL (data residency, retention, consent for AI processing).

**Exit criteria:** deployed to staging behind SSO, all gates green, zero critical a11y findings.

### Days 31–60 — Make the AI genuinely useful

- **Live suggestions** from the AI service: server-side retrieval of evidence, citations returned as activity ids
  (the UI contract already supports this), streaming "generating…" state.
- **Feedback loop:** capture approve / dismiss / edit-before-apply as labelled data; show reviewers _why_ a suggestion
  was dismissed.
- **Calibration:** compare stated confidence with approval and outcome rates; re-tune the band thresholds per change type.
- **Evaluation harness:** offline test set of activity histories → expected suggestions, run on every model change;
  block release on grounding regressions (suggestions citing non-supporting evidence).
- **More reviewable actions:** draft follow-up e-mail (Arabic/English) with diff + approval, same gate.

**Exit criteria:** ≥ 80 % of applied suggestions not reverted within 7 days; zero applies without approval (audited).

### Days 61–90 — Scale and polish

- **Performance:** `zod/mini` (largest remaining lever), lazy-load the inactive locale, render one responsive list
  layout instead of two, list virtualisation for large page sizes, route-level code splitting as views grow.
- **Design system:** document the tokens and primitives (Storybook), visual-regression tests for ar/en × light/dark.
- **Product:** saved views, bulk actions with the same approval semantics, Hijri date preference, per-field language
  handling for single-language records.
- **Offline tolerance:** queue manual edits during short connectivity loss with explicit "pending" state.

**Exit criteria:** p75 INP < 200 ms on mid-range Android (field data), JS ≤ 120 KB gzip, design-system docs adopted by a
second team.
