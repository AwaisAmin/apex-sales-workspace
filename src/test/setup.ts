import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import i18n from '@/i18n/config'
import { session } from '@/api/session'
import { resetToastsForTests } from '@/components/ui/toast-store'
import { DEFAULT_CHAOS, initChaos, setChaos } from '@/mocks/chaos'
import { server, resetMockDb } from './server'

// jsdom does not implement <dialog>.showModal()/close(). Minimal polyfill with the semantics we rely on:
// `open` attribute and a non-bubbling `close` event.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
// jsdom has no layout, so these are no-ops there.
Element.prototype.scrollIntoView ??= () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

beforeEach(async () => {
  // Every test starts from the same seed, an instant & reliable "server", the rep role and English.
  resetMockDb()
  initChaos('')
  setChaos({ ...DEFAULT_CHAOS, latency: 'none' })
  session.signIn('u-rep')
  await i18n.changeLanguage('en')
})

afterEach(() => {
  cleanup()
  resetToastsForTests()
  localStorage.clear()
})

afterAll(() => server.close())
