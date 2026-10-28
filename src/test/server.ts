import { setupServer } from 'msw/node'
import { createDb, type Db } from '@/mocks/db'
import { createHandlers } from '@/mocks/handlers'

/*
 * The same MSW handlers the browser uses, running in Node. Tests therefore exercise
 * the real request pipeline (auth, roles, validation, version checks) — not stubs.
 */
export let db: Db = createDb()
export const server = setupServer(...createHandlers(db))

/** Fresh in-memory database for each test, so tests can't leak state into each other. */
export function resetMockDb() {
  db = createDb()
  server.resetHandlers(...createHandlers(db))
}
