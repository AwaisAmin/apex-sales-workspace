/*
 * Build-time replacement for `tough-cookie`, aliased in vite.config.ts.
 *
 * MSW uses tough-cookie only to emulate document.cookie for mocked requests/responses. It
 * pulls in `tldts` (a ~255 kB public-suffix list), which made the mock chunk the largest
 * download on first load — and the app waits for the mock worker before rendering.
 * This app's mock API never reads or sets cookies (the session is a header), so an empty
 * cookie jar is behaviourally identical here.
 *
 * Trade-off: mock handlers cannot rely on cookies. Remove the alias if that is ever needed.
 * Surface implemented = exactly what msw/lib/_chunks/cookie-store.js calls.
 */

type CookieIndex = Record<string, Record<string, Record<string, unknown>>>

export class MemoryCookieStore {
  idx: CookieIndex = {}
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}

  getCookiesSync(_url: string): never[] {
    return []
  }

  async setCookie(_cookie: string, _url: string): Promise<void> {}
}

export const Cookie = {
  fromJSON: (_raw: unknown): null => null,
}
