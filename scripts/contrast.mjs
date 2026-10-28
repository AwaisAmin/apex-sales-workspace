// WCAG 2.x contrast check for every foreground/background token pair the UI actually uses.
// Reads src/styles/tokens.css (light-dark(<light>, <dark>) values), so the numbers in the
// audit always match the shipped tokens.
// Usage: npm run audit:contrast   (exits 1 if any pair fails its threshold)
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

const light = {}
const dark = {}
for (const [, name, l, d] of css.matchAll(
  /--color-([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi,
)) {
  light[name] = l
  dark[name] = d
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const ch = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

// [foreground, background, minimum, where it is used]. 4.5 = normal text, 3 = large text / UI components.
const PAIRS = [
  ['fg', 'bg', 4.5, 'body text on page'],
  ['fg', 'surface', 4.5, 'text in cards/tables'],
  ['fg-muted', 'surface', 4.5, 'secondary text, labels'],
  ['fg-muted', 'surface-muted', 4.5, 'secondary text on muted rows/badges'],
  ['fg-muted', 'bg', 4.5, 'page descriptions'],
  ['primary-fg', 'primary', 4.5, 'primary buttons, active chips'],
  ['success', 'success-bg', 4.5, 'Qualified / Won badges'],
  ['warning', 'warning-bg', 4.5, 'Contacted / Proposal badges, low-confidence note'],
  ['danger', 'danger-bg', 4.5, 'errors, Overdue badge'],
  ['danger', 'surface', 4.5, '"Mark as Unqualified" text, error text'],
  ['info', 'info-bg', 4.5, 'New / Discovery badges'],
  ['info', 'surface', 4.5, 'evidence links'],
  ['ai', 'ai-bg', 4.5, 'AI badge'],
  ['ai', 'surface', 4.5, 'AI assistant heading'],
  ['ai-fg', 'ai', 4.5, '"Review & apply" (AI) button'],
  ['danger-fg', 'danger', 4.5, 'toast / danger button'],
  ['success-fg', 'success', 4.5, 'success toast'],
  ['fg', 'surface-muted', 4.5, 'selected theme option'],
  ['focus', 'surface', 3, 'focus ring (non-text, WCAG 1.4.11)'],
  ['focus', 'bg', 3, 'focus ring on page background'],
  ['border-strong', 'surface', 3, 'input/select/segmented-control boundary (WCAG 1.4.11)'],
  ['border-strong', 'bg', 3, 'input/select boundary on page background'],
  ['primary', 'surface', 3, 'selected chip vs unselected (state change)'],
  ['border', 'surface', 0, 'decorative dividers (informational, no WCAG minimum)'],
]

if (Object.keys(light).length === 0) {
  console.error('No light-dark() colour tokens found in tokens.css')
  process.exit(1)
}

let failed = 0
for (const [theme, t] of [
  ['light', light],
  ['dark', dark],
]) {
  console.log(`\n${theme.toUpperCase()}`)
  console.log('ratio   min  result  pair → usage')
  for (const [fg, bg, min, usage] of PAIRS) {
    if (!t[fg] || !t[bg]) {
      console.log(`  —     ${min}   MISSING --color-${fg} / --color-${bg}`)
      failed++
      continue
    }
    const r = ratio(t[fg], t[bg])
    const ok = r >= min
    if (!ok) failed++
    console.log(
      `${r.toFixed(2).padStart(5)}:1 ${String(min).padEnd(4)} ${ok ? 'PASS' : 'FAIL'}    ${fg} on ${bg} → ${usage}`,
    )
  }
}
console.log(failed ? `\n${failed} pair(s) below threshold` : `\nAll ${PAIRS.length * 2} checks meet WCAG 2.1 AA`)
process.exit(failed ? 1 : 0)
