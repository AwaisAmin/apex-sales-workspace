import 'i18next'
import type { en } from './locales/en'

// Makes t('nav.leads') type-checked and autocompleted; a typo in a key fails the build.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}
