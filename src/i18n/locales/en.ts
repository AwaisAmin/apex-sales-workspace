// English is the source locale: its shape defines the type every other locale must match.
export const en = {
  app: {
    name: 'Apex Sales',
    tagline: 'AI-assisted sales workspace',
    skipToContent: 'Skip to main content',
  },
  nav: {
    leads: 'Leads',
    opportunities: 'Opportunities',
  },
  language: {
    label: 'Language',
    switchTo: 'العربية',
  },
  common: {
    loading: 'Loading…',
    retry: 'Try again',
    cancel: 'Cancel',
    empty: 'Nothing to show yet.',
    error: 'Something went wrong.',
  },
}

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<typeof en>
