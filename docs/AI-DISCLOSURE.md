# AI-use disclosure

The assessment permits AI assistance provided it is disclosed with specific uses. This is that disclosure.

> **Note to the candidate — remove this block before submitting.** This draft was written by the AI assistant from the
> session history. Correct anything that does not match what you personally did, decided or verified. You must be able
> to explain every decision listed here in the review.

## Tool

**Claude Code** (Anthropic, model Claude Opus 5.5) used in VS Code, in a step-by-step session. The assistant wrote files
and ran commands in the repository (installs, builds, tests, browser checks). I made every git commit myself after
reviewing each step.

## How the work was divided

| Area                                             | AI assistant                                                                  | Me (candidate)                                                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interpreting the brief, scope and step plan      | Proposed the stack and a 15-step plan                                         | Accepted/adjusted the plan; set the pace step by step                                                                                                                                       |
| Application code (components, hooks, API, mocks) | Generated the large majority of the code                                      | Reviewed each step before committing; asked for changes                                                                                                                                     |
| UI/UX corrections                                | Implemented them                                                              | **Identified them:** dropdown arrow too close to the edge, missing pointer cursors, the "Updating…" indicator overlapping the header, a better status-change UI, the missing theme switcher |
| Testing                                          | Wrote unit, component and E2E tests; ran mutation checks; debugged failures   | Reviewed results; [add what you ran or checked yourself]                                                                                                                                    |
| Performance & accessibility audit                | Wrote the measurement scripts, ran Lighthouse/axe, diagnosed and fixed issues | Reviewed the findings; [add any manual checks, e.g. NVDA, real phone]                                                                                                                       |
| Documentation                                    | Drafted README, architecture, audit, decisions memo, this file                | Requested Prettier and project documentation; reviewed and edited                                                                                                                           |

## Specific uses

1. **Code generation** for all layers (React components, TanStack Query hooks, Zod schemas, MSW handlers, seed data).
2. **Debugging**, including issues found only by tests: a React batching race that left the approval dialog stuck,
   toasts not announced inside modal dialogs, focus lost when a dialog's opener disappeared, a rollback test that
   passed even with rollback removed.
3. **Verification in a browser** (Chrome automation) of RTL layout, keyboard flows, focus order and contrast.
4. **Performance diagnosis:** bundle analysis, CPU profiling, Lighthouse runs and the fixes in [AUDIT.md](AUDIT.md).
5. **Arabic UI copy** was machine-written. [State whether you, or a native speaker, reviewed it.]
6. **Writing** of the documentation in `docs/` and the README.

## What I verified myself

[Fill in honestly — for example: ran the app locally in English and Arabic, ran `npm run check` and `npm run test:e2e`,
walked through the reviewer demo, read the approval-gate code and the policy tests, tested on my phone.]

## Data and safety

- No real customer data, credentials or Apex systems were used; all data is synthetic and generated in code.
- The AI assistant had no access to Apex systems — only this repository and the assessment brief, which I provided to
  it in the session to define the task.
