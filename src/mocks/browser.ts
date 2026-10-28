import { setupWorker } from 'msw/browser'
import { initChaos } from './chaos'
import { createDb } from './db'
import { createHandlers } from './handlers'

/**
 * The prototype has no real backend, so mocking is on in every build (dev and preview).
 * A real deployment would gate this behind `import.meta.env.VITE_API_MOCK`.
 * Data lives in memory: a page reload restores the seed.
 */
export async function startMockApi() {
  initChaos()
  const worker = setupWorker(...createHandlers(createDb()))
  await worker.start({
    quiet: true,
    // Fail loudly if the UI calls an endpoint we forgot to mock.
    onUnhandledFrame: ({ frame, defaults }) => {
      if (frame.protocol !== 'http') return
      const { request } = frame.data as { request: Request }
      if (new URL(request.url).pathname.startsWith('/api')) defaults.error()
    },
  })
}
