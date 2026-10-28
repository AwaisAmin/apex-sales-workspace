export const activityAnchor = (id: string) => `activity-${id}`

/** Move focus to a cited activity and briefly highlight it — the target of an evidence link. */
export function focusActivity(id: string) {
  const el = document.getElementById(activityAnchor(id))
  if (!el) return
  el.scrollIntoView({
    block: 'center',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
  el.focus({ preventScroll: true })
  el.dataset.highlight = 'true'
  setTimeout(() => delete el.dataset.highlight, 2000)
}
