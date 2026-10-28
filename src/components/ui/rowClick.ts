import type { MouseEvent } from 'react'

/**
 * Mouse convenience: clicking anywhere on a row selects it. Keyboard and screen-reader users
 * use the row's RecordLink, so the row itself is not a second tab stop.
 */
export function rowClickHandler(onSelect: () => void) {
  return (e: MouseEvent) => {
    // Let links/buttons handle their own clicks, and don't hijack text selection.
    if ((e.target as HTMLElement).closest('a, button') || window.getSelection()?.toString()) return
    onSelect()
  }
}
