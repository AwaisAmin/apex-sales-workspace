// Lighthouse audit of the production build (run `npm run build && npm run preview` first).
// Runs each URL × preset several times and reports the MEDIAN, because single Lighthouse runs vary.
// Usage: node scripts/lighthouse.mjs [baseUrl] [runs] [mode]   → writes docs/evidence/lighthouse-<mode>.json
//   mode "simulated" (default): the mock API's artificial 250–800 ms latency is included — what a reviewer sees.
//   mode "app-only": ?latency=none, isolating the frontend's own cost from the fake network delay.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = process.argv[2] ?? 'http://localhost:4173'
const runs = Number(process.argv[3] ?? 3)
const mode = process.argv[4] ?? 'simulated'
const withMode = (path) => (mode === 'app-only' ? path + (path.includes('?') ? '&' : '?') + 'latency=none' : path)
// [name, path, browser language]. A first-time visitor gets Arabic from navigator.language.
const pages = [
  ['leads (en)', '/leads', 'en'],
  ['leads (ar)', '/leads', 'ar'],
  ['lead drawer + AI (en)', '/leads?lead=lead-001', 'en'],
]
const presets = ['desktop', 'mobile']

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const out = []
const tmp = join(tmpdir(), 'apex-lh')
mkdirSync(tmp, { recursive: true })

for (const preset of presets) {
  for (const [name, path, lang] of pages) {
    const samples = []
    for (let i = 0; i < runs; i++) {
      const file = join(tmp, `lh-${preset}-${i}.json`)
      const args = [
        '-y',
        'lighthouse@12',
        // Quoted: the command runs through a shell, and cmd.exe treats a bare `&` in the URL as a separator.
        `"${base + withMode(path)}"`,
        '--quiet',
        '--output=json',
        `--output-path=${file}`,
        '--only-categories=performance,accessibility,best-practices',
        `--chrome-flags="--headless=new --lang=${lang}"`,
      ]
      if (preset === 'desktop') args.push('--preset=desktop')
      execFileSync('npx', args, { stdio: 'ignore', shell: true })
      const r = JSON.parse(readFileSync(file, 'utf8'))
      const a = r.audits
      samples.push({
        perf: r.categories.performance.score * 100,
        a11y: r.categories.accessibility.score * 100,
        bp: r.categories['best-practices'].score * 100,
        fcp: a['first-contentful-paint'].numericValue,
        lcp: a['largest-contentful-paint'].numericValue,
        tbt: a['total-blocking-time'].numericValue,
        cls: a['cumulative-layout-shift'].numericValue,
        si: a['speed-index'].numericValue,
        bytes: a['total-byte-weight'].numericValue,
      })
    }
    const m = (k) => median(samples.map((s) => s[k]))
    const row = {
      mode,
      preset,
      page: name,
      runs,
      performance: m('perf'),
      accessibility: m('a11y'),
      bestPractices: m('bp'),
      fcpMs: Math.round(m('fcp')),
      lcpMs: Math.round(m('lcp')),
      tbtMs: Math.round(m('tbt')),
      cls: Number(m('cls').toFixed(3)),
      speedIndexMs: Math.round(m('si')),
      transferKB: Math.round(m('bytes') / 1024),
    }
    out.push(row)
    console.log(JSON.stringify(row))
  }
}

mkdirSync('docs/evidence', { recursive: true })
writeFileSync(
  `docs/evidence/lighthouse-${mode}.json`,
  JSON.stringify({ date: new Date().toISOString(), base, mode, runsPerCell: runs, results: out }, null, 2),
)
