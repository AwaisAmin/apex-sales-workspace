import type { Locale } from '@/i18n/config'

/*
 * All user-visible numbers, money and dates go through these helpers — never
 * toString() or manual string building — so Arabic gets Arabic-Indic digits,
 * correct separators and right-to-left-safe output.
 *
 * Assumption: business dates use the Gregorian calendar in both languages
 * (`ar-SA` alone defaults to Umm al-Qura/Hijri). Hijri display can be added
 * later as a user preference.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-SA',
  ar: 'ar-SA-u-ca-gregory',
}

// Intl constructors are relatively expensive; tables call these per cell, so cache them.
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>()

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(
  key: string,
  create: () => T,
): T {
  let formatter = cache.get(key) as T | undefined
  if (!formatter) {
    formatter = create()
    cache.set(key, formatter)
  }
  return formatter
}

export function formatNumber(value: number, locale: Locale) {
  return cached(`n:${locale}`, () => new Intl.NumberFormat(INTL_LOCALE[locale])).format(value)
}

export function formatPercent(ratio: number, locale: Locale) {
  return cached(
    `p:${locale}`,
    () => new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'percent', maximumFractionDigits: 0 }),
  ).format(ratio)
}

export function formatCurrency(amount: number, locale: Locale, currency = 'SAR') {
  return cached(
    `c:${locale}:${currency}`,
    () =>
      new Intl.NumberFormat(INTL_LOCALE[locale], {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }),
  ).format(amount)
}

export function formatDate(iso: string, locale: Locale) {
  return cached(
    `d:${locale}`,
    () => new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium' }),
  ).format(new Date(iso))
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 days ago" / "قبل ٣ أيام". `now` is injectable so tests are deterministic. */
export function formatRelative(iso: string, locale: Locale, now: Date = new Date()) {
  const rtf = cached(
    `r:${locale}`,
    () => new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' }),
  )
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}
